import { ALB_LOGS_LIVE_POLL_MS, ALB_LOGS_PAGE_LIMIT, buildAlbLogQL } from './o11y-log.helpers';
import { createO11yLogService, o11yLogKeys } from './o11y-log.service';
import { AuthenticationError, AuthorizationError, ValidationError } from '@/utils/errors';
import type { LogEntry, LogFilters, LogTimeRange } from '@datum-cloud/datum-ui/logs';
import { filterEntries, lastThirtyMinutes, resolveLogTimeRange } from '@datum-cloud/datum-ui/logs';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

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
