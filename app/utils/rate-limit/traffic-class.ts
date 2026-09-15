/**
 * Path-based traffic classification shared by the server rate limiter and the
 * client gate. Kept free of server and browser imports so both sides can use
 * it and can never disagree about which bucket a request belongs to.
 *
 * See datum-cloud/cloud-portal#1543.
 */

export type TrafficClass = 'machine' | 'interactive';

/** Every bucket a request can be rejected by; also the `X-RateLimit-Class` values. */
export type RateLimitBucket = TrafficClass | 'ceiling' | 'penalty';

export const RATE_LIMIT_BUCKETS: readonly RateLimitBucket[] = [
  'machine',
  'interactive',
  'ceiling',
  'penalty',
];

const API_PREFIX = '/api';

/**
 * Route groups whose traffic the portal generates on its own: watch
 * subscriptions, metric polls, log queries, and permission batches.
 */
const MACHINE_ROUTE_GROUPS: ReadonlySet<string> = new Set([
  'watch',
  'prometheus',
  'grafana',
  'permissions',
]);

/**
 * Proxied API groups the portal polls on a timer. The load balancer log tail
 * goes through /api/proxy, so the route group alone cannot tell it apart from
 * a click; the upstream API group can.
 */
const MACHINE_PROXY_GROUPS: readonly string[] = ['/apis/o11y.miloapis.com/'];

/** Removes a leading `/api` segment; leaves every other path untouched. */
export function stripApiPrefix(path: string): string {
  return path.startsWith(`${API_PREFIX}/`) ? path.slice(API_PREFIX.length) : path;
}

function withoutQuery(path: string): string {
  const index = path.indexOf('?');
  return index === -1 ? path : path.slice(0, index);
}

/** First path segment after /api, or `unknown` when there is none. */
export function resolveRouteGroup(path: string): string {
  const [first] = withoutQuery(stripApiPrefix(path)).split('/').filter(Boolean);
  return first ?? 'unknown';
}

/** Classifies an /api path. Accepts the path with or without the /api prefix. */
export function resolveTrafficClass(path: string): TrafficClass {
  const relative = withoutQuery(stripApiPrefix(path));
  const group = resolveRouteGroup(relative);
  if (MACHINE_ROUTE_GROUPS.has(group)) return 'machine';
  if (group === 'proxy' && MACHINE_PROXY_GROUPS.some((g) => relative.includes(g))) {
    return 'machine';
  }
  return 'interactive';
}
