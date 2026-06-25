import type { Instance } from './instance.schema';
import { createInstanceService, instanceKeys } from './instance.service';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export function useWorkloadInstances(
  projectId: string,
  workloadName: string | undefined,
  options?: Omit<UseQueryOptions<Instance[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: instanceKeys.list(projectId, workloadName),
    queryFn: () => createInstanceService().listByWorkload(projectId, workloadName!),
    enabled: !!projectId && !!workloadName,
    ...options,
  });
}

export function useInstance(
  projectId: string,
  instanceName: string | undefined,
  options?: Omit<UseQueryOptions<Instance>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: instanceKeys.detail(projectId, instanceName ?? ''),
    queryFn: () => createInstanceService().get(projectId, instanceName!),
    enabled: !!projectId && !!instanceName,
    ...options,
  });
}
