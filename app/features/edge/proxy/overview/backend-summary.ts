import type { HttpProxy } from '@/resources/http-proxies';

export interface BackendSummary {
  /** Number of backends the portal model can see, or null when it cannot tell. */
  count: number | null;
  /** One-line description for the Endpoints card. */
  label: string;
}

/**
 * Count every backend across every route.
 *
 * Prefers `routes`, which sees all four backend kinds. The flat `origins` and
 * `connector` fields describe only the first origin and are the fallback for
 * an HttpProxy assembled by hand rather than read from the API.
 */
export function summarizeBackends(proxy: HttpProxy): BackendSummary {
  const routes = (proxy.routes ?? []).filter((route) => !route.isRedirect);
  const backends = routes.flatMap((route) => route.backends);

  if (backends.length > 0) {
    if (backends.length === 1) {
      const only = backends[0];
      if (only.kind === 'endpoint' && only.endpoint) return { count: 1, label: only.endpoint };
      if (only.kind === 'connector' && only.connector) {
        return { count: 1, label: `Connector · ${only.connector.name}` };
      }
      if (only.kind === 'networkService' && only.networkService) {
        return { count: 1, label: `Service · ${only.networkService.name}` };
      }
    }
    return { count: backends.length, label: `${backends.length} backends` };
  }

  // Fallback: no routes to read, so fall back to the flat fields.
  const origins = proxy.origins ?? (proxy.endpoint ? [proxy.endpoint] : []);
  if (origins.length > 0) {
    return {
      count: origins.length,
      label: origins.length === 1 ? origins[0] : `${origins.length} backends`,
    };
  }
  if (proxy.connector?.name) {
    return { count: 1, label: `Connector · ${proxy.connector.name}` };
  }

  // A proxy read from the API with routes but no backends genuinely has none;
  // one with no routes at all is a model we cannot see into, so say nothing.
  if (proxy.routes) return { count: 0, label: 'No backends configured' };
  return { count: null, label: 'View backend configuration' };
}
