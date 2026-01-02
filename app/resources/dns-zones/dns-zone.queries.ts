import type {
  DnsZone,
  DnsZoneList,
  CreateDnsZoneInput,
  UpdateDnsZoneInput,
} from './dns-zone.schema';
import { createDnsZoneService, dnsZoneKeys } from './dns-zone.service';
import { useServiceContext } from '@/providers/service.provider';
import type { PaginationParams } from '@/resources/base/base.schema';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

export function useDnsZones(
  projectId: string,
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<DnsZoneList>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createDnsZoneService(ctx);

  return useQuery({
    queryKey: dnsZoneKeys.list(projectId, params),
    queryFn: () => service.list(projectId, params),
    enabled: !!projectId,
    ...options,
  });
}

export function useDnsZone(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<DnsZone>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createDnsZoneService(ctx);

  return useQuery({
    queryKey: dnsZoneKeys.detail(projectId, name),
    queryFn: () => service.get(projectId, name),
    enabled: !!(projectId && name),
    ...options,
  });
}

export function useDnsZonesByDomainRef(
  projectId: string,
  domainRef: string,
  options?: Omit<UseQueryOptions<DnsZoneList>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createDnsZoneService(ctx);

  return useQuery({
    queryKey: dnsZoneKeys.byDomainRef(projectId, domainRef),
    queryFn: () => service.listByDomainRef(projectId, domainRef),
    enabled: !!(projectId && domainRef),
    ...options,
  });
}

export function useCreateDnsZone(
  projectId: string,
  options?: UseMutationOptions<DnsZone, Error, CreateDnsZoneInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createDnsZoneService(ctx);

  return useMutation({
    mutationFn: (input: CreateDnsZoneInput) => service.create(projectId, input),
    onSuccess: (newDnsZone) => {
      queryClient.invalidateQueries({ queryKey: dnsZoneKeys.lists() });
      queryClient.setQueryData(dnsZoneKeys.detail(projectId, newDnsZone.name), newDnsZone);
    },
    ...options,
  });
}

export function useUpdateDnsZone(
  projectId: string,
  name: string,
  options?: UseMutationOptions<DnsZone, Error, UpdateDnsZoneInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createDnsZoneService(ctx);

  return useMutation({
    mutationFn: (input: UpdateDnsZoneInput) => service.update(projectId, name, input),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dnsZoneKeys.detail(projectId, name) });
      queryClient.invalidateQueries({ queryKey: dnsZoneKeys.lists() });
    },
    ...options,
  });
}

export function useDeleteDnsZone(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createDnsZoneService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(projectId, name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({ queryKey: dnsZoneKeys.detail(projectId, name) });
      queryClient.invalidateQueries({ queryKey: dnsZoneKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hydrates React Query cache with SSR data for DNS zones list.
 */
export function useHydrateDnsZones(projectId: string, initialData: DnsZone[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(dnsZoneKeys.list(projectId), { items: initialData });
      hydrated.current = true;
    }
  }, [queryClient, projectId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single DNS zone.
 */
export function useHydrateDnsZone(projectId: string, name: string, initialData: DnsZone) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(dnsZoneKeys.detail(projectId, name), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, name, initialData]);
}
