import type {
  DnsZone,
  DnsZoneList,
  CreateDnsZoneInput,
  UpdateDnsZoneInput,
} from './dns-zone.schema';
import { createDnsZoneService, dnsZoneKeys } from './dns-zone.service';
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
  return useQuery({
    queryKey: dnsZoneKeys.list(projectId, params),
    queryFn: () => createDnsZoneService().list(projectId, params),
    enabled: !!projectId,
    ...options,
  });
}

export function useDnsZone(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<DnsZone>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dnsZoneKeys.detail(projectId, name),
    queryFn: () => createDnsZoneService().get(projectId, name),
    enabled: !!(projectId && name),
    ...options,
  });
}

export function useDnsZonesByDomainRef(
  projectId: string,
  domainRef: string,
  options?: Omit<UseQueryOptions<DnsZoneList>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dnsZoneKeys.byDomainRef(projectId, domainRef),
    queryFn: () => createDnsZoneService().listByDomainRef(projectId, domainRef),
    enabled: !!(projectId && domainRef),
    ...options,
  });
}

export function useCreateDnsZone(
  projectId: string,
  options?: UseMutationOptions<DnsZone, Error, CreateDnsZoneInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDnsZoneInput) => createDnsZoneService().create(projectId, input),
    ...options,
    onSuccess: (...args) => {
      const [newDnsZone] = args;
      // Set detail cache - Watch handles list update
      queryClient.setQueryData(dnsZoneKeys.detail(projectId, newDnsZone.name), newDnsZone);

      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateDnsZone(
  projectId: string,
  name: string,
  options?: UseMutationOptions<DnsZone, Error, UpdateDnsZoneInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateDnsZoneInput) =>
      createDnsZoneService().update(projectId, name, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache with server response - Watch handles list sync
      queryClient.setQueryData(dnsZoneKeys.detail(projectId, name), data);

      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteDnsZone(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createDnsZoneService().delete(projectId, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      // Cancel in-flight queries - Watch handles list update
      await queryClient.cancelQueries({ queryKey: dnsZoneKeys.detail(projectId, name) });

      options?.onSuccess?.(...args);
    },
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
