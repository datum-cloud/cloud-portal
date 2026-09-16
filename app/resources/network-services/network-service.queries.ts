import type { NetworkService } from './network-service.schema';
import { createNetworkServiceService, networkServiceKeys } from './network-service.service';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export function useNetworkServices(
  projectId: string,
  options?: Omit<UseQueryOptions<NetworkService[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: networkServiceKeys.list(projectId),
    queryFn: () => createNetworkServiceService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useNetworkService(
  projectId: string,
  name: string | undefined,
  options?: Omit<UseQueryOptions<NetworkService>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: networkServiceKeys.detail(projectId, name ?? ''),
    queryFn: () => createNetworkServiceService().get(projectId, name!),
    enabled: !!projectId && !!name,
    ...options,
  });
}
