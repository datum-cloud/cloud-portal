import type { ComDatumapisNetworkingV1AlphaNetworkService } from '@/modules/control-plane/networking';
import { getNavExtensions } from '@/modules/plugins/client/match-extension';
import { useProjectPlugins } from '@/modules/plugins/client/use-project-plugins';
import type { PublicPlugin } from '@/modules/plugins/types';
import { COMPUTE_WORKLOAD_NAME_LABEL, type HttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';

export { COMPUTE_WORKLOAD_NAME_LABEL };

/** Canonical service id the compute plugin's nav extension declares as `serviceRef`. */
export const COMPUTE_SERVICE_REF = 'compute.datumapis.com';
/** `name` in the compute plugin's `plugin-manifest.json`. */
export const COMPUTE_PLUGIN_MANIFEST_NAME = 'workload.compute.datumapis.com';

/**
 * Pick the registered plugin that renders compute workloads. The mount slug is
 * operator-supplied (`PORTAL_PLUGINS="<slug>=<url>"` in dev, the PortalPlugin
 * CRD in production), so it is discovered from the plugin list rather than
 * hard-coded: match on the nav extension's `serviceRef` or the manifest name.
 */
export function findComputePluginSlug(plugins: PublicPlugin[] | undefined): string | undefined {
  if (!plugins) return undefined;
  const match = plugins.find(
    (plugin) =>
      plugin.manifest.name === COMPUTE_PLUGIN_MANIFEST_NAME ||
      getNavExtensions(plugin.manifest).some(
        (nav) => nav.properties.serviceRef?.trim() === COMPUTE_SERVICE_REF
      )
  );
  return match?.slug;
}

/**
 * Slug the compute plugin is mounted under for this project, or undefined when
 * it is not registered / the project is not entitled. Callers should render
 * plain text instead of a link in that case — the mount would 404.
 */
export function useComputePluginSlug(projectId: string | undefined): string | undefined {
  const { data: plugins } = useProjectPlugins(projectId, { enabled: !!projectId });
  return useMemo(() => findComputePluginSlug(plugins), [plugins]);
}

/** Workload detail page under the compute plugin mount (`<root>/<workloadName>`). */
export function computeWorkloadHref(
  projectId: string,
  pluginSlug: string,
  workloadName: string
): string {
  const root = getPathWithParams(paths.project.detail.services.plugin, {
    projectId,
    serviceSlug: pluginSlug,
  });
  return `${root}/${encodeURIComponent(workloadName)}`;
}

export function workloadNameFromNetworkService(
  service: ComDatumapisNetworkingV1AlphaNetworkService
): string | undefined {
  return (
    service.metadata?.labels?.[COMPUTE_WORKLOAD_NAME_LABEL] ||
    service.spec?.networkInterfaces?.selector?.matchLabels?.[COMPUTE_WORKLOAD_NAME_LABEL]
  );
}

export function isComputeBackend(proxy: HttpProxy | undefined): boolean {
  return Boolean(proxy?.workloadName || proxy?.networkService?.name);
}
