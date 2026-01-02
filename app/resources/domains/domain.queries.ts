import type { Domain, CreateDomainInput, UpdateDomainInput } from './domain.schema';
import { createDomainService, domainKeys } from './domain.service';
import { useServiceContext } from '@/providers/service.provider';
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
  const ctx = useServiceContext();
  const service = createDomainService(ctx);

  return useQuery({
    queryKey: domainKeys.list(projectId),
    queryFn: () => service.list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useDomain(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<Domain>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createDomainService(ctx);

  return useQuery({
    queryKey: domainKeys.detail(projectId, name),
    queryFn: () => service.get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

export function useCreateDomain(
  projectId: string,
  options?: UseMutationOptions<Domain, Error, CreateDomainInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createDomainService(ctx);

  return useMutation({
    mutationFn: (input: CreateDomainInput) => service.create(projectId, input),
    onSuccess: (newDomain) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.lists() });
      queryClient.setQueryData(domainKeys.detail(projectId, newDomain.name), newDomain);
    },
    ...options,
  });
}

type UpdateDomainContext = { previous: Domain | undefined };

export function useUpdateDomain(
  projectId: string,
  name: string,
  options?: UseMutationOptions<Domain, Error, UpdateDomainInput, UpdateDomainContext>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createDomainService(ctx);

  return useMutation<Domain, Error, UpdateDomainInput, UpdateDomainContext>({
    mutationFn: (input: UpdateDomainInput) => service.update(projectId, name, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: domainKeys.detail(projectId, name),
      });

      const previous = queryClient.getQueryData<Domain>(domainKeys.detail(projectId, name));

      if (previous) {
        queryClient.setQueryData(domainKeys.detail(projectId, name), {
          ...previous,
          domainName: input.domainName ?? previous.domainName,
        });
      }

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(domainKeys.detail(projectId, name), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: domainKeys.detail(projectId, name),
      });
      queryClient.invalidateQueries({
        queryKey: domainKeys.lists(),
      });
    },
    ...options,
  });
}

export function useDeleteDomain(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createDomainService(ctx);

  return useMutation({
    mutationFn: (name: string) => service.delete(projectId, name),
    onSuccess: (_data, name) => {
      queryClient.removeQueries({
        queryKey: domainKeys.detail(projectId, name),
      });
      queryClient.invalidateQueries({
        queryKey: domainKeys.lists(),
      });
    },
    ...options,
  });
}

export function useBulkCreateDomains(
  projectId: string,
  options?: UseMutationOptions<Domain[], Error, string[]>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createDomainService(ctx);

  return useMutation({
    mutationFn: (domains: string[]) => service.bulkCreate(projectId, domains),
    onSuccess: (newDomains) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.lists() });
      for (const domain of newDomains) {
        queryClient.setQueryData(domainKeys.detail(projectId, domain.name), domain);
      }
    },
    ...options,
  });
}

type RefreshDomainContext = { previous: Domain | undefined; timestamp: string };

export function useRefreshDomainRegistration(
  projectId: string,
  options?: UseMutationOptions<Domain, Error, string, RefreshDomainContext>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const service = createDomainService(ctx);

  return useMutation<Domain, Error, string, RefreshDomainContext>({
    mutationFn: (name: string) => service.refreshRegistration(projectId, name),
    onMutate: async (name) => {
      // Cancel any outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({
        queryKey: domainKeys.detail(projectId, name),
      });

      const previous = queryClient.getQueryData<Domain>(domainKeys.detail(projectId, name));
      const timestamp = new Date().toISOString();

      // Optimistically update the cache with new timestamp
      if (previous) {
        queryClient.setQueryData(domainKeys.detail(projectId, name), {
          ...previous,
          desiredRegistrationRefreshAttempt: timestamp,
        });
      }

      return { previous, timestamp };
    },
    onError: (_err, name, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(domainKeys.detail(projectId, name), context.previous);
      }
    },
    onSuccess: (data, name) => {
      // Update cache with actual response from server
      queryClient.setQueryData(domainKeys.detail(projectId, name), data);

      // Also invalidate lists to keep them in sync
      queryClient.invalidateQueries({
        queryKey: domainKeys.lists(),
      });
      // Also invalidate DNS zones since they depend on domain nameserver status
      queryClient.invalidateQueries({
        queryKey: dnsZoneKeys.lists(),
      });
    },
    ...options,
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
