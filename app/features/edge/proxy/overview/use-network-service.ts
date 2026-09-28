import {
  computeWorkloadHref,
  useComputePluginSlug,
  workloadNameFromNetworkService,
} from './compute-backend';
import { useComputeWorkloadPresence } from '@/resources/compute-workloads';
import type { HttpProxy } from '@/resources/http-proxies';
import { useNetworkService } from '@/resources/network-services';

export interface ResolvedComputeWorkload {
  /** Workload name from the proxy label, or resolved from the NetworkService. */
  workloadName: string | undefined;
  networkServiceName: string | undefined;
  /**
   * The backend still names a workload, but it has been deleted (404) or is
   * terminating. The ALB keeps selecting by that name, so a redeploy under the
   * same name reconnects it. False when existence can't be checked (403).
   */
  workloadMissing: boolean;
  /**
   * Detail-page link in the compute plugin. Undefined when the workload is
   * unknown or missing, or the plugin is not registered for this project, in
   * which case callers should fall back to plain text.
   */
  href: string | undefined;
  isLoading: boolean;
}

/**
 * Resolve the compute workload behind an HTTPProxy: proxy label first, then
 * the NetworkService selector/labels when the backend is a networkService.
 * The NetworkService read is skipped when the label already names the workload.
 * 403/404 on that read degrade to "unknown workload" rather than failing the page.
 * The workload itself is then read to catch one that was deleted while its ALB
 * (and the NetworkService selecting it) were kept.
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
  const presence = useComputeWorkloadPresence(projectId ?? '', workloadName);
  const workloadMissing = presence.data === 'missing';

  return {
    workloadName,
    networkServiceName: nsName,
    workloadMissing,
    href:
      projectId && pluginSlug && workloadName && !workloadMissing
        ? computeWorkloadHref(projectId, pluginSlug, workloadName)
        : undefined,
    // Held until presence resolves so a dead "View workload" link never flashes.
    isLoading: (needsFetch && query.isLoading) || (!!workloadName && presence.isLoading),
  };
}
