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
      // Cancel in-flight queries for the deleted domain
      await queryClient.cancelQueries({ queryKey: domainKeys.detail(projectId, name) });
      // Optimistically remove from list cache so UI updates immediately
      queryClient.setQueryData<Domain[]>(domainKeys.list(projectId), (old) =>
        old ? old.filter((d) => d.name !== name) : old
      );
      queryClient.removeQueries({ queryKey: domainKeys.detail(projectId, name) });
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
