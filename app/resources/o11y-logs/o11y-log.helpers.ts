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

/** Every distinct hostname on the row — filter and facets list all of them. */
export function albHostValues(labels: Record<string, string>): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const raw of [
    labels.host,
    labels.requested_server_name,
    labels.x_forwarded_host,
    labels.authority,
  ]) {
    const host = raw?.trim();
    if (!host || seen.has(host)) continue;
    seen.add(host);
    values.push(host);
  }
  return values;
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
