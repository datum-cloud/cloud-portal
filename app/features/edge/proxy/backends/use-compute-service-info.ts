import type { ComputeServiceInfo } from './backend-pool';
import {
  computeWorkloadHref,
  useComputePluginSlug,
  workloadNameFromNetworkService,
} from '@/features/edge/proxy/overview/compute-backend';
import { useNetworkServices } from '@/resources/network-services';
import { useMemo } from 'react';

/**
 * What a workload backend row shows about the compute service behind it: the
 * workload's name and page, its instances' health, where they run, and the
 * port number its named port maps to. Missing or unreadable services leave the
 * row on what the HTTPProxy itself says.
 */
export function useComputeServiceInfo(
  projectId: string | undefined,
  enabled = true
): ReadonlyMap<string, ComputeServiceInfo> {
  const { data: services } = useNetworkServices(projectId ?? '', {
    enabled: enabled && !!projectId,
  });
  const pluginSlug = useComputePluginSlug(enabled ? projectId : undefined);

  return useMemo(() => {
    const byName = new Map<string, ComputeServiceInfo>();
    for (const service of services ?? []) {
      const name = service.metadata?.name;
      if (!name) continue;
      const workloadName = workloadNameFromNetworkService(service);
      const summary = service.status?.summary;
      byName.set(name, {
        workloadName,
        healthy: summary?.healthy,
        members: summary?.members,
        locations: (service.status?.locations ?? []).map((location) => location.name),
        ports: Object.fromEntries((service.spec.ports ?? []).map((port) => [port.name, port.port])),
        href:
          projectId && pluginSlug && workloadName
            ? computeWorkloadHref(projectId, pluginSlug, workloadName)
            : undefined,
      });
    }
    return byName;
  }, [services, pluginSlug, projectId]);
}
