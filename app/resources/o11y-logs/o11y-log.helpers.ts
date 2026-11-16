import type { LogEntry, LogFacet, LogFilters } from '@datum-cloud/datum-ui/logs';
import { buildLogQL, facetsFromEntries, logRequestHost } from '@datum-cloud/datum-ui/logs';

/**
 * Facets the ALB explorer exposes. Live Envoy OTEL access logs set these as
 * attributes; `severity` / `service_name` are usually empty. Identity labels
 * (`route_name`) stay locked in LogQL.
 */
export const ALB_LOG_FACET_NAMES = ['method', 'response_code', 'host'] as const;

export const ALB_LOG_FACET_LABELS: Record<(typeof ALB_LOG_FACET_NAMES)[number], string> = {
  method: 'Method',
  response_code: 'Status code',
  host: 'Host',
};

/** Envoy's access-log placeholder for a missing field. */
const ENVOY_EMPTY_VALUE = '-';

const CLIENT_HOST_FILTERS = [
  'host',
  'authority',
  'requested_server_name',
  'x_forwarded_host',
  'resource_name',
] as const;

export const ALB_LOGS_PAGE_LIMIT = 500;
export const ALB_LOGS_PREVIEW_LIMIT = 20;
export const ALB_LOGS_LIVE_POLL_MS = 5_000;

const LOKI_LABEL_ESCAPE = /[.*+?^${}()|[\]\\]/g;

function escapeLogQLQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeLogQLRegexp(value: string): string {
  return value.replace(LOKI_LABEL_ESCAPE, '\\$&');
}

/**
 * Envoy `%ROUTE_NAME%` is `httproute/<namespace>/<httpProxyName>/rule/<i>/match/<j>`.
 * Live OTEL access logs store that on LogAttributes.route_name — not
 * `resource_name`, which only exists in queryapi's fake store.
 */
export function albRouteNameRegexp(proxyId: string): string {
  return `httproute/[^/]+/${escapeLogQLRegexp(proxyId)}/.*`;
}

/**
 * Extra filters (method, response_code, …) for the explorer. Drops identity
 * labels so the UI cannot escape the current load balancer.
 */
export function albLogMatchers(_proxyId: string, extraFilters: LogFilters = {}): LogFilters {
  const {
    resource_name: _ignoredResource,
    route_name: _ignoredRoute,
    host: _ignoredHost,
    authority: _ignoredAuthority,
    requested_server_name: _ignoredSni,
    x_forwarded_host: _ignoredXfh,
    ...rest
  } = extraFilters;
  return rest;
}

/** Labels the Host column reads, in the order it prefers them. */
const ALB_HOST_LABEL_ORDER = [
  'host',
  'requested_server_name',
  'x_forwarded_host',
  'authority',
] as const;

/**
 * The row's host, as the Host column shows it: the first host label set, so
 * the filter and facet match what each row displays. `authority` comes last
 * because the proxy rewrites it to the backend's name (e.g. httpbin.org).
 * An array so callers can treat "no host" as empty.
 */
export function albHostValues(labels: Record<string, string>): string[] {
  for (const label of ALB_HOST_LABEL_ORDER) {
    const host = labels[label]?.trim();
    // Envoy writes "-" for a header it didn't get; that's not a host.
    if (host && host !== ENVOY_EMPTY_VALUE) return [host];
  }
  return [];
}

/** Host is stamped client-side, so it cannot go into LogQL. */
export function filterAlbLogsByHost(
  entries: readonly LogEntry[],
  filters: LogFilters = {}
): LogEntry[] {
  const selected = new Set<string>();
  for (const key of CLIENT_HOST_FILTERS) {
    for (const value of filters[key] ?? []) {
      if (value) selected.add(value);
    }
  }
  if (selected.size === 0) return [...entries];
  return entries.filter((entry) => albHostValues(entry.labels).some((host) => selected.has(host)));
}

/**
 * LogQL for one ALB: `{route_name=~"httproute/<ns>/<proxyId>/..."}` plus extra
 * label matchers. Search is applied client-side — OTEL access logs put fields
 * on attributes with an empty Body, so `|=` would match nothing.
 */
export function buildAlbLogQL(proxyId: string, extraFilters?: LogFilters): string {
  const extras = albLogMatchers(proxyId, extraFilters);
  const pin = `route_name=~"${escapeLogQLQuoted(albRouteNameRegexp(proxyId))}"`;
  const hasExtras = Object.values(extras).some((values) => values.length > 0);
  if (!hasExtras) return `{${pin}}`;
  return `{${pin}, ${buildLogQL({ matchers: extras }).slice(1)}`;
}

/** Facets in display order, labeled for access-log attributes. */
export function albLogFacets(entries: readonly LogEntry[]): LogFacet[] {
  const hosted = entries.map(withAlbHostLabel);
  const byName = new Map(
    facetsFromEntries(hosted, ['method', 'response_code']).map((facet) => [facet.name, facet])
  );
  const hostFacet = hostFacetFromEntries(hosted);
  return ALB_LOG_FACET_NAMES.flatMap((name) => {
    if (name === 'host') return hostFacet ? [hostFacet] : [];
    const facet = byName.get(name);
    if (!facet) return [];
    return [{ ...facet, label: ALB_LOG_FACET_LABELS[name] }];
  });
}

function withAlbHostLabel(entry: LogEntry): LogEntry {
  const host = logRequestHost(entry.labels);
  if (!host || entry.labels.host === host) return entry;
  return { ...entry, labels: { ...entry.labels, host } };
}

function hostFacetFromEntries(entries: readonly LogEntry[]): LogFacet | null {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const host of albHostValues(entry.labels)) {
      counts.set(host, (counts.get(host) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return null;
  const options = [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, count }));
  return { name: 'host', label: ALB_LOG_FACET_LABELS.host, options };
}

/**
 * Labels each facet's count groups by. Host has no single label: the Host
 * column resolves it from several (see `albHostValues`), so its count groups
 * by all of them and resolves each group.
 */
export const ALB_LOG_FACET_SOURCE_LABELS = {
  method: ['method'],
  response_code: ['response_code'],
  host: ALB_HOST_LABEL_ORDER,
} as const satisfies Record<(typeof ALB_LOG_FACET_NAMES)[number], readonly string[]>;

/**
 * Labels whose values list a facet's options. Host lists only the names a
 * client asks for: a row's `x_forwarded_host` or `authority` is rarely its
 * host, and Host's counts add any that are.
 */
const ALB_LOG_FACET_OPTION_LABELS = {
  method: ['method'],
  response_code: ['response_code'],
  host: ['host', 'requested_server_name'],
} as const satisfies Record<(typeof ALB_LOG_FACET_NAMES)[number], readonly string[]>;

/** Every label `ALB_LOG_FACET_OPTION_LABELS` reads, once each. */
export const ALB_LOG_FACET_QUERY_LABELS: readonly string[] = [
  ...new Set(Object.values(ALB_LOG_FACET_OPTION_LABELS).flat()),
];

export type AlbLogFacetName = (typeof ALB_LOG_FACET_NAMES)[number];

/** Lines per value for one facet; see `albFacetCounts`. */
export type AlbFacetCounts = ReadonlyMap<string, number>;

/** One group from a `sum by (...) (count_over_time(...))` vector. */
export interface LogLabelCount {
  labels: Record<string, string>;
  count: number;
}

/**
 * Count query for one facet: lines in the last `seconds` per value, applying
 * every other ticked facet that LogQL can filter on but not the facet's own,
 * so ticking GET still shows how many POSTs there are. Host groups by every
 * label it is resolved from (queryapi allows four).
 */
export function buildAlbFacetCountQuery(
  proxyId: string,
  facet: AlbLogFacetName,
  filters: LogFilters,
  seconds: number
): string {
  const others = { ...filters };
  delete others[facet];
  const by = ALB_LOG_FACET_SOURCE_LABELS[facet].join(', ');
  const range = Math.max(1, Math.ceil(seconds));
  return `sum by (${by}) (count_over_time(${buildAlbLogQL(proxyId, others)} [${range}s]))`;
}

/**
 * Whether the server can count a facet the way the table filters. Search and
 * Host are applied in the browser (see `buildAlbLogQL`), so with search on,
 * or a host ticked for another facet, a server count would disagree with the
 * rows and the facet shows no counts instead.
 */
export function albFacetCountable(
  facet: AlbLogFacetName,
  filters: LogFilters,
  search: string
): boolean {
  if (search.trim()) return false;
  if (facet === 'host') return true;
  return !CLIENT_HOST_FILTERS.some((key) => (filters[key]?.length ?? 0) > 0);
}

/**
 * Per-value counts for one facet. Host resolves each group to one host, as
 * the Host column and `filterAlbLogsByHost` do.
 */
export function albFacetCounts(
  facet: AlbLogFacetName,
  groups: readonly LogLabelCount[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { labels, count } of groups) {
    const values = facet === 'host' ? albHostValues(labels) : [labels[facet]?.trim() ?? ''];
    for (const value of values) {
      if (!value || value === ENVOY_EMPTY_VALUE) continue;
      counts.set(value, (counts.get(value) ?? 0) + count);
    }
  }
  return counts;
}

/**
 * Facets from `/label/{name}/values` results, keyed by label name. These list
 * every value the load balancer logged in the window, whatever is ticked, so
 * ticking one option never hides the others. A facet with counts gives every
 * option one (0 when nothing matches the other filters); a facet without
 * shows none. A facet with no values is left out, matching `albLogFacets`.
 */
export function albLogFacetsFromLabelValues(
  valuesByLabel: Readonly<Record<string, readonly string[] | undefined>>,
  countsByFacet: Partial<Record<AlbLogFacetName, AlbFacetCounts>> = {}
): LogFacet[] {
  return ALB_LOG_FACET_NAMES.flatMap((name) => {
    const counts = countsByFacet[name];
    // With counts, Host's resolved hosts are exact, so list just those and
    // `host` itself; without, SNI fills in for rows with no Host header.
    const labels = name === 'host' && counts ? ['host'] : ALB_LOG_FACET_OPTION_LABELS[name];
    const seen = new Set<string>();
    for (const label of labels) {
      for (const raw of valuesByLabel[label] ?? []) {
        const value = raw.trim();
        // Envoy writes "-" for a header it didn't get; that's not a value.
        if (value && value !== ENVOY_EMPTY_VALUE) seen.add(value);
      }
    }
    // A value can land between the two requests; list it rather than drop it.
    for (const value of counts?.keys() ?? []) seen.add(value);
    if (seen.size === 0) return [];
    const options = [...seen]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((value) => (counts ? { value, count: counts.get(value) ?? 0 } : { value }));
    return [{ name, label: ALB_LOG_FACET_LABELS[name], options }];
  });
}
