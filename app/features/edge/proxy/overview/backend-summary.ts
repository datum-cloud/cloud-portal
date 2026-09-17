import { workloadNameFromNetworkService } from './compute-backend';
import type { ComDatumapisNetworkingV1AlphaNetworkService } from '@/modules/control-plane/networking';
import type { HttpProxy } from '@/resources/http-proxies';

export interface BackendSummary {
  /** Number of backends the portal model can see, or null when it cannot tell. */
  count: number | null;
  /** One-line description for the Endpoints card. */
  label: string;
  /** Compute workload name when this ALB fronts a workload. */
  workloadName?: string;
  /** NetworkService name when the backend is a compute-exposed service. */
  networkServiceName?: string;
}

/**
 * Summarize the backends the portal can name. Endpoint URLs, connectors, and
 * compute NetworkService / labelled workloads are all first-class; anything
 * else stays opaque rather than reporting "0".
 *
 * @param workloadName Overrides the proxy's own label when the caller has
 * resolved the workload elsewhere (e.g. from the NetworkService).
 */
export function summarizeBackends(
  proxy: HttpProxy,
  workloadName: string | undefined = proxy.workloadName
): BackendSummary {
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
  if (workloadName) {
    return {
      count: 1,
      label: workloadName,
      workloadName,
      networkServiceName: proxy.networkService?.name,
    };
  }
  if (proxy.networkService?.name) {
    return {
      count: 1,
      label: `Compute · ${proxy.networkService.name}`,
      networkServiceName: proxy.networkService.name,
    };
  }
  return { count: null, label: 'View backend configuration' };
}

export interface ListOriginDisplay {
  text: string;
  workloadName?: string;
  empty: boolean;
}

/**
 * Origin cell for the ALB list. Resolves a compute workload from the proxy
 * label, or from a NetworkService map when the backend is a networkService.
 */
export function listOriginDisplay(
  proxy: HttpProxy,
  servicesByName?: Map<string, ComDatumapisNetworkingV1AlphaNetworkService>
): ListOriginDisplay {
  const nsName = proxy.networkService?.name;
  const service = !proxy.workloadName && nsName ? servicesByName?.get(nsName) : undefined;
  const fromService = service ? workloadNameFromNetworkService(service) : undefined;

  const summary = summarizeBackends(proxy, proxy.workloadName || fromService);

  if (summary.count === null) {
    return { text: '—', empty: true };
  }

  return {
    text: summary.label,
    workloadName: summary.workloadName,
    empty: false,
  };
}
