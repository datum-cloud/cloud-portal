import type { Domain, CreateDomainInput, UpdateDomainInput } from './domain.schema';
import { createDomainService, domainKeys } from './domain.service';
import { dnsZoneKeys } from '@/resources/dns-zones/dns-zone.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

export function useDomains(
  projectId: string,
  options?: Omit<UseQueryOptions<Domain[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: domainKeys.list(projectId),
    queryFn: () => createDomainService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useDomain(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<Domain>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: domainKeys.detail(projectId, name),
    queryFn: () => createDomainService().get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

export function useCreateDomain(
  projectId: string,
  options?: UseMutationOptions<Domain, Error, CreateDomainInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDomainInput) => createDomainService().create(projectId, input),
    ...options,
    onSuccess: (...args) => {
      const [newDomain] = args;
      // Set detail cache - Watch handles list update
      queryClient.setQueryData(domainKeys.detail(projectId, newDomain.name), newDomain);
      queryClient.invalidateQueries({ queryKey: domainKeys.list(projectId) });

      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateDomain(
  projectId: string,
  name: string,
  options?: UseMutationOptions<Domain, Error, UpdateDomainInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateDomainInput) => createDomainService().update(projectId, name, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      // Update detail cache with server response - Watch handles list sync
      queryClient.setQueryData(domainKeys.detail(projectId, name), data);
      queryClient.invalidateQueries({ queryKey: domainKeys.list(projectId) });

      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteDomain(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createDomainService().delete(projectId, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      // Cancel in-flight queries - Watch handles list update
      await queryClient.cancelQueries({ queryKey: domainKeys.detail(projectId, name) });
      queryClient.invalidateQueries({ queryKey: domainKeys.list(projectId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useBulkCreateDomains(
  projectId: string,
  options?: UseMutationOptions<Domain[], Error, string[]>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (domains: string[]) => createDomainService().bulkCreate(projectId, domains),
    ...options,
    onSuccess: (...args) => {
      const [newDomains] = args;
      // Set detail cache for each - Watch handles list update
      for (const domain of newDomains) {
        queryClient.setQueryData(domainKeys.detail(projectId, domain.name), domain);
      }

      options?.onSuccess?.(...args);
    },
  });
}

export function useRefreshDomainRegistration(
  projectId: string,
  options?: UseMutationOptions<Domain, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createDomainService().refreshRegistration(projectId, name),
    ...options,
    onSuccess: (...args) => {
      const [data, name] = args;
      // Update detail cache with server response - Watch handles list sync
      queryClient.setQueryData(domainKeys.detail(projectId, name), data);
      // Invalidate DNS zones since they depend on domain nameserver status
      queryClient.invalidateQueries({ queryKey: dnsZoneKeys.lists() });

      options?.onSuccess?.(...args);
    },
  });
}

/**
 * Hydrates React Query cache with SSR data for domains list.
 */
export function useHydrateDomains(projectId: string, initialData: Domain[]) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(domainKeys.list(projectId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single domain.
 */
export function useHydrateDomain(
  projectId: string,
  name: string,
  initialData: Domain | null | undefined
) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData && name) {
      queryClient.setQueryData(domainKeys.detail(projectId, name), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, name, initialData]);
}
