import type { DnsZoneDiscovery } from './dns-zone-discovery.schema';
import { createDnsZoneDiscoveryService, dnsZoneDiscoveryKeys } from './dns-zone-discovery.service';
import { useServiceContext } from '@/providers/service.provider';
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
  const ctx = useServiceContext();
  const service = createDnsZoneDiscoveryService(ctx);

  return useQuery({
    queryKey: dnsZoneDiscoveryKeys.list(projectId, dnsZoneId),
    queryFn: () => service.list(projectId, dnsZoneId),
    enabled: !!projectId,
    ...options,
  });
}

export function useDnsZoneDiscovery(
  projectId: string,
  id: string,
  options?: Omit<UseQueryOptions<DnsZoneDiscovery>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createDnsZoneDiscoveryService(ctx);

  return useQuery({
    queryKey: dnsZoneDiscoveryKeys.detail(projectId, id),
    queryFn: () => service.get(projectId, id),
    enabled: !!(projectId && id),
    ...options,
  });
}

export function useCreateDnsZoneDiscovery(
  projectId: string,
  options?: UseMutationOptions<DnsZoneDiscovery, Error, string>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createDnsZoneDiscoveryService(ctx);

  return useMutation({
    mutationFn: (dnsZoneId: string) =>
      service.create(projectId, dnsZoneId) as Promise<DnsZoneDiscovery>,
    onSuccess: (newDiscovery, dnsZoneId) => {
      queryClient.invalidateQueries({ queryKey: dnsZoneDiscoveryKeys.lists() });
      queryClient.setQueryData(
        dnsZoneDiscoveryKeys.detail(projectId, newDiscovery.name),
        newDiscovery
      );
    },
    ...options,
  });
}
