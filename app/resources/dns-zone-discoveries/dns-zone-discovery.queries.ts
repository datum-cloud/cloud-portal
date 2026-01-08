import type { DnsZoneDiscovery } from './dns-zone-discovery.schema';
import { createDnsZoneDiscoveryService, dnsZoneDiscoveryKeys } from './dns-zone-discovery.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useDnsZoneDiscoveries(
  projectId: string,
  dnsZoneId?: string,
  options?: Omit<UseQueryOptions<DnsZoneDiscovery[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dnsZoneDiscoveryKeys.list(projectId, dnsZoneId),
    queryFn: () => createDnsZoneDiscoveryService().list(projectId, dnsZoneId),
    enabled: !!projectId,
    ...options,
  });
}

export function useDnsZoneDiscovery(
  projectId: string,
  id: string,
  options?: Omit<UseQueryOptions<DnsZoneDiscovery>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dnsZoneDiscoveryKeys.detail(projectId, id),
    queryFn: () => createDnsZoneDiscoveryService().get(projectId, id),
    enabled: !!(projectId && id),
    ...options,
  });
}

export function useCreateDnsZoneDiscovery(
  projectId: string,
  options?: UseMutationOptions<DnsZoneDiscovery, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dnsZoneId: string) =>
      createDnsZoneDiscoveryService().create(projectId, dnsZoneId) as Promise<DnsZoneDiscovery>,
    ...options,
    onSuccess: (...args) => {
      const [newDiscovery] = args;
      queryClient.invalidateQueries({ queryKey: dnsZoneDiscoveryKeys.lists() });
      queryClient.setQueryData(
        dnsZoneDiscoveryKeys.detail(projectId, newDiscovery.name),
        newDiscovery
      );

      options?.onSuccess?.(...args);
    },
  });
}
