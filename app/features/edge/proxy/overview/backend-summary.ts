import type { HttpProxy } from '@/resources/http-proxies';

export interface BackendSummary {
  /** Number of backends the portal model can see, or null when it cannot tell. */
  count: number | null;
  /** One-line description for the Endpoints card. */
  label: string;
}

/**
 * The HttpProxy model only surfaces `endpoint` and `connector` backends;
 * `networkService` backends are opaque to it. Rather than report "0", say
 * nothing about the count when the model has no visibility.
 */
export function summarizeBackends(proxy: HttpProxy): BackendSummary {
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
  return { count: null, label: 'View backend configuration' };
}
