import { toWorkload } from './workload.adapter';
import type { Workload } from './workload.schema';
import { workloadKeys } from './workload.service';
import type { ComDatumapisComputeV1AlphaWorkload } from '@/modules/control-plane/compute';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch workloads list for real-time updates.
 */
export function useWorkloadsWatch(projectId: string, options?: { enabled?: boolean }) {
  const queryKey = workloadKeys.list(projectId);

  useResourceWatch<Workload>({
    resourceType: 'apis/compute.datumapis.com/v1alpha/workloads',
    projectId,
    namespace: 'default',
    queryKey,
    transform: (item) => toWorkload(item as ComDatumapisComputeV1AlphaWorkload),
    enabled: options?.enabled ?? true,
    getItemKey: (workload) => workload.name,
  });
}
