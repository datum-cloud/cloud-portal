import { toInstance } from './instance.adapter';
import type { Instance } from './instance.schema';
import { instanceKeys, workloadInstancesSelector } from './instance.service';
import type { ComDatumapisComputeV1AlphaInstance } from '@/modules/control-plane/compute';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch a workload's instances for real-time updates.
 */
export function useWorkloadInstancesWatch(
  projectId: string,
  workloadName: string | undefined,
  options?: { enabled?: boolean }
) {
  const queryKey = instanceKeys.list(projectId, workloadName);

  useResourceWatch<Instance>({
    resourceType: 'apis/compute.datumapis.com/v1alpha/instances',
    projectId,
    namespace: 'default',
    labelSelector: workloadName ? workloadInstancesSelector(workloadName) : undefined,
    queryKey,
    transform: (item) => toInstance(item as ComDatumapisComputeV1AlphaInstance),
    enabled: (options?.enabled ?? true) && !!projectId && !!workloadName,
    getItemKey: (instance) => instance.name,
  });
}
