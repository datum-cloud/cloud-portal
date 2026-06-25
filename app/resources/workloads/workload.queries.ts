import type { Workload } from './workload.schema';
import { createWorkloadService, workloadKeys } from './workload.service';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export function useWorkloads(
  projectId: string,
  options?: Omit<UseQueryOptions<Workload[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workloadKeys.list(projectId),
    queryFn: () => createWorkloadService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useWorkload(
  projectId: string,
  name: string | undefined,
  options?: Omit<UseQueryOptions<Workload>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workloadKeys.detail(projectId, name ?? ''),
    queryFn: () => createWorkloadService().get(projectId, name!),
    enabled: !!projectId && !!name,
    ...options,
  });
}
