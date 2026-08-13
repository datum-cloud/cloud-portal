import { parseResourceFromUrl } from '@/modules/sentry';
import { Counter, register } from 'prom-client';

const UPSTREAM_RESPONSES_TOTAL = 'portal_upstream_responses_total';

/**
 * Counts every upstream request outcome observed by the server-side axios
 * layer — successes and errors alike — so expected-4xx anomaly alerts have a
 * baseline denominator. Connection-level failures (timeout/DNS/refused, no
 * HTTP response) are recorded with status="network", never as a fabricated
 * HTTP status. Labels are bounded by design: resource names and namespaces
 * are never included (cardinality control).
 *
 * Reuses the already-registered metric if present: module-level construction
 * throws "already registered" when the dev server hot-reloads this module
 * against prom-client's default registry; get-or-create makes re-evaluation
 * idempotent (same pattern as quota-metrics / rbac metrics).
 */
export const upstreamResponsesTotal =
  (register.getSingleMetric(UPSTREAM_RESPONSES_TOTAL) as
    | Counter<'status' | 'api_group' | 'resource_type' | 'method'>
    | undefined) ??
  new Counter({
    name: UPSTREAM_RESPONSES_TOTAL,
    help: 'Count of upstream API responses observed by the server axios layer',
    labelNames: ['status', 'api_group', 'resource_type', 'method'] as const,
  });

export interface UpstreamResponseSample {
  method?: string;
  url?: string;
  status: number | string;
}

/**
 * Increment `portal_upstream_responses_total` for one upstream response.
 * `api_group`/`resource_type` are derived from the URL path; both fall back
 * to "unknown" when the URL is not a K8s-style API path. No-op outside the
 * server runtime.
 */
export function recordUpstreamResponse({ method, url, status }: UpstreamResponseSample): void {
  if (typeof window !== 'undefined') return;
  try {
    const resource = url ? parseResourceFromUrl(url) : null;
    upstreamResponsesTotal.inc({
      status: String(status),
      api_group: resource?.apiGroup ?? 'unknown',
      resource_type: resource?.resourceType ?? 'unknown',
      method: method?.toUpperCase() ?? 'UNKNOWN',
    });
  } catch {
    // Metrics must never fail the request path.
  }
}
