import {
  ALB_LOG_FACET_QUERY_LABELS,
  ALB_LOGS_LIVE_POLL_MS,
  ALB_LOGS_PAGE_LIMIT,
  albFacetCountable,
  albFacetCounts,
  albLogFacetsFromLabelValues,
  buildAlbFacetCountQuery,
  buildAlbLogQL,
  type AlbFacetCounts,
  type AlbLogFacetName,
  type LogLabelCount,
} from './o11y-log.helpers';
import { createO11yLogService, o11yLogKeys } from './o11y-log.service';
import { AuthenticationError, AuthorizationError, ValidationError } from '@/utils/errors';
import type { LogEntry, LogFacet, LogFilters, LogTimeRange } from '@datum-cloud/datum-ui/logs';
import { filterEntries, lastThirtyMinutes, resolveLogTimeRange } from '@datum-cloud/datum-ui/logs';
import {
  keepPreviousData,
  useQueries,
  useQuery,
  type Query,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useMemo } from 'react';

/** Position of projectId in the query-range and label-values keys (proxyId or query follows). */
const KEY_PROJECT_INDEX = o11yLogKeys.all.length + 1;

/**
 * `keepPreviousData`, but only for the same project and load balancer (or
 * scope query): a filter, search or range change keeps the old rows and
 * options on screen until the new ones arrive, while switching ALB never
 * shows another one's logs.
 */
export function keepPreviousInScope<T>(projectId: string, scope: string) {
  return (previous: T | undefined, previousQuery?: Query<T, Error, T, readonly unknown[]>) => {
    const key = previousQuery?.queryKey;
    return key?.[KEY_PROJECT_INDEX] === projectId && key?.[KEY_PROJECT_INDEX + 1] === scope
      ? keepPreviousData(previous)
      : undefined;
  };
}

/**
 * Facet options don't depend on the exact timestamps, so key a preset window
 * by its name: a filter click re-resolves "last 30m" to now, and keying by
 * timestamps refetched every facet on every click. An absolute range keys by
 * its bounds.
 */
export function facetWindowKey(timeRange: LogTimeRange, live: boolean): string {
  if (live) return `live:${timeRange.preset ?? 'last-30m'}`;
  return timeRange.preset ? `preset:${timeRange.preset}` : `${timeRange.from}/${timeRange.to}`;
}

export interface UseAlbLogsOptions {
  timeRange: LogTimeRange;
  filters?: LogFilters;
  search?: string;
  live?: boolean;
  limit?: number;
  enabled?: boolean;
}

/**
 * Query range for one ALB. Live mode polls and re-anchors the preset window
 * to "now" on every tick; queryapi has no tail endpoint. Search is applied
 * client-side against the fields the table shows, because OTEL access logs
 * keep an empty Body and `|=` would match nothing.
 */
export function useAlbLogs(
  projectId: string,
  proxyId: string,
  options: UseAlbLogsOptions,
  queryOptions?: Omit<UseQueryOptions<LogEntry[]>, 'queryKey' | 'queryFn'>
) {
  const {
    timeRange,
    filters,
    search,
    live = false,
    limit = ALB_LOGS_PAGE_LIMIT,
    enabled = true,
  } = options;

  const query = buildAlbLogQL(proxyId, filters);
  const windowKey = live ? 'live' : `${timeRange.from}/${timeRange.to}`;

  return useQuery({
    queryKey: o11yLogKeys.queryRange(projectId, proxyId, query, windowKey, limit),
    queryFn: () => {
      const range = live
        ? resolveLogTimeRange(timeRange.preset ? timeRange : lastThirtyMinutes())
        : timeRange;
      return createO11yLogService().queryRange({
        projectId,
        query,
        start: range.from,
        end: range.to,
        limit,
        direction: 'backward',
      });
    },
    select: (entries) => filterEntries(entries, {}, search),
    placeholderData: keepPreviousInScope<LogEntry[]>(projectId, proxyId),
    enabled: enabled && !!projectId && !!proxyId,
    refetchInterval: live ? ALB_LOGS_LIVE_POLL_MS : false,
    staleTime: live ? 0 : 15_000,
    retry: (failureCount, error) => {
      if (
        error instanceof AuthorizationError ||
        error instanceof AuthenticationError ||
        error instanceof ValidationError
      ) {
        return false;
      }
      return failureCount < 3;
    },
    ...queryOptions,
  });
}

function isFinalLogsError(error: unknown): boolean {
  return (
    error instanceof AuthorizationError ||
    error instanceof AuthenticationError ||
    error instanceof ValidationError
  );
}

/**
 * Facets for one ALB across the time window. Options come from
 * `/label/{name}/values` scoped to the load balancer only, so ticking a value
 * never removes the others. Counts come from one count query per facet that
 * applies the other facets' filters (see `buildAlbFacetCountQuery`); a facet
 * the server can't count like the table (search on, or a host ticked for
 * another facet) shows options without counts.
 *
 * Returns `null` until the options and the counts have loaded, or if an
 * options request failed, so the caller can fall back to facets built from
 * the fetched rows. A failed count leaves only that facet without counts.
 */
export function useAlbLogFacets(
  projectId: string,
  proxyId: string,
  options: {
    timeRange: LogTimeRange;
    filters?: LogFilters;
    search?: string;
    live?: boolean;
    enabled?: boolean;
  }
): LogFacet[] | null {
  const { timeRange, filters = EMPTY_FILTERS, search = '', live = false, enabled = true } = options;
  const scope = buildAlbLogQL(proxyId);
  const windowKey = facetWindowKey(timeRange, live);
  const active = enabled && !!projectId && !!proxyId;
  const refetchInterval = live ? ALB_LOGS_LIVE_POLL_MS * 6 : (false as const);

  const valuesByLabel = useQueries({
    queries: ALB_LOG_FACET_QUERY_LABELS.map((name) => ({
      queryKey: o11yLogKeys.labelValues(projectId, scope, name, windowKey),
      queryFn: () => {
        const range = resolveFacetWindow(timeRange, live);
        return createO11yLogService().labelValues({
          projectId,
          name,
          query: scope,
          start: range.from,
          end: range.to,
        });
      },
      enabled: active,
      // Options change slowly; live mode refreshes them less often than rows.
      refetchInterval,
      staleTime: 60_000,
      retry: facetRetry,
    })),
    combine: combineLabelValues,
  });

  // One useQuery per facet rather than more useQueries entries: a filter click
  // changes these keys, and only a useQuery keeps its previous counts on
  // screen while the new ones load (useQueries starts a fresh observer).
  const countOptions = { projectId, proxyId, filters, search, timeRange, live, active };
  const method = useAlbFacetCount('method', countOptions);
  const status = useAlbFacetCount('response_code', countOptions);
  const host = useAlbFacetCount('host', countOptions);

  return useMemo(() => {
    if (!valuesByLabel) return null;
    const countsByFacet: Partial<Record<AlbLogFacetName, AlbFacetCounts>> = {};
    for (const count of [method, status, host]) {
      if (!count.countable) continue;
      if (count.data) countsByFacet[count.facet] = albFacetCounts(count.facet, count.data);
      // First load: wait for counts rather than show options that gain
      // numbers a moment later. A failed count just leaves them off.
      else if (!count.isError) return null;
    }
    return albLogFacetsFromLabelValues(valuesByLabel, countsByFacet);
  }, [valuesByLabel, method, status, host]);
}

const EMPTY_FILTERS: LogFilters = {};

function facetRetry(failureCount: number, error: unknown): boolean {
  return !isFinalLogsError(error) && failureCount < 2;
}

/** Facet requests are keyed by preset, so resolve it to now when one runs. */
function resolveFacetWindow(timeRange: LogTimeRange, live: boolean): LogTimeRange {
  if (live) return resolveLogTimeRange(timeRange.preset ? timeRange : lastThirtyMinutes());
  return timeRange.preset ? resolveLogTimeRange(timeRange) : timeRange;
}

interface AlbFacetCountOptions {
  projectId: string;
  proxyId: string;
  filters: LogFilters;
  search: string;
  timeRange: LogTimeRange;
  live: boolean;
  active: boolean;
}

function useAlbFacetCount(facet: AlbLogFacetName, options: AlbFacetCountOptions) {
  const { projectId, proxyId, filters, search, timeRange, live, active } = options;
  const countable = albFacetCountable(facet, filters, search);
  const window = resolveFacetWindow(timeRange, live);
  const seconds = (Date.parse(window.to) - Date.parse(window.from)) / 1000;
  const query = buildAlbFacetCountQuery(proxyId, facet, filters, seconds);

  const result = useQuery({
    queryKey: o11yLogKeys.labelCounts(projectId, proxyId, query, facetWindowKey(timeRange, live)),
    queryFn: () =>
      createO11yLogService().countByLabels({
        projectId,
        query,
        time: resolveFacetWindow(timeRange, live).to,
      }),
    placeholderData: keepPreviousInScope<LogLabelCount[]>(projectId, proxyId),
    enabled: active && countable,
    refetchInterval: live ? ALB_LOGS_LIVE_POLL_MS * 6 : false,
    staleTime: 30_000,
    retry: facetRetry,
  });

  return useMemo(
    () => ({ facet, countable, data: result.data, isError: result.isError }),
    [facet, countable, result.data, result.isError]
  );
}

/**
 * Module-level so its identity is stable: TanStack re-runs `combine` only when
 * a result changes, and structurally shares what it returns.
 */
function combineLabelValues(
  results: ReadonlyArray<{ isSuccess: boolean; data?: string[] }>
): Record<string, readonly string[]> | null {
  if (!results.every((result) => result.isSuccess)) return null;
  const valuesByLabel: Record<string, readonly string[]> = {};
  ALB_LOG_FACET_QUERY_LABELS.forEach((name, index) => {
    valuesByLabel[name] = results[index]?.data ?? [];
  });
  return valuesByLabel;
}
