import {
  computeWorkloadHref,
  useComputePluginSlug,
  workloadNameFromNetworkService,
} from './compute-backend';
import type { HttpProxy } from '@/resources/http-proxies';
import { useNetworkService } from '@/resources/network-services';

export interface ResolvedComputeWorkload {
  /** Workload name from the proxy label, or resolved from the NetworkService. */
  workloadName: string | undefined;
  networkServiceName: string | undefined;
  /**
   * Detail-page link in the compute plugin. Undefined when the workload is
   * unknown or the plugin is not registered for this project, in which case
   * callers should fall back to plain text.
   */
  href: string | undefined;
  isLoading: boolean;
}

/**
 * Resolve the compute workload behind an HTTPProxy: proxy label first, then
 * the NetworkService selector/labels when the backend is a networkService.
 * The NetworkService read is skipped when the label already names the workload.
 * 403/404 on that read degrade to "unknown workload" rather than failing the page.
 */
export function useResolvedComputeWorkload(
  projectId: string | undefined,
  proxy: HttpProxy | undefined
): ResolvedComputeWorkload {
  const labelled = proxy?.workloadName;
  const nsName = proxy?.networkService?.name;
  const needsFetch = Boolean(projectId && nsName && !labelled);
  const query = useNetworkService(projectId ?? '', needsFetch ? nsName : undefined);
  const fromService = query.data ? workloadNameFromNetworkService(query.data) : undefined;
  const workloadName = labelled || fromService;
  const pluginSlug = useComputePluginSlug(projectId);

  return {
    workloadName,
    networkServiceName: nsName,
    href:
      projectId && pluginSlug && workloadName
        ? computeWorkloadHref(projectId, pluginSlug, workloadName)
        : undefined,
    isLoading: needsFetch && query.isLoading,
  };
}
