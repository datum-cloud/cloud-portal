import type { Domain, CreateDomainInput, UpdateDomainInput } from './domain.schema';
import { DOMAIN_SYNC_KIND, createDomainService, domainKeys } from './domain.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import {
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import { withAllowanceRefresh } from '@/resources/allowance-buckets';
import { dnsZoneKeys } from '@/resources/dns-zones/dns-zone.service';
import {
  useQuery,
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

/** Domains are watched: mutations write the lists and never invalidate them. */
export function domainMutations(projectId: string) {
  return defineResourceMutations<Domain>({
    kind: DOMAIN_SYNC_KIND,
    scope: projectId,
    keys: {
      lists: [...domainKeys.lists(), projectId],
      detail: (name) => domainKeys.detail(projectId, name),
    },
    getName: (domain) => domain.name,
    getMeta: (domain) => ({ name: domain.name, resourceVersion: domain.resourceVersion }),
    watched: true,
  });
}

export function toPendingDomain(input: CreateDomainInput, pendingName: string): Domain {
  return {
    uid: pendingName,
    name: input.name ?? pendingName,
    namespace: 'default',
    resourceVersion: '',
    createdAt: new Date(),
    domainName: input.domainName,
    desiredRegistrationRefreshAttempt: '',
  };
}

export function useCreateDomain(
  projectId: string,
  options?: UseMutationOptions<Domain, Error, CreateDomainInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: CreateDomainInput) => createDomainService().create(projectId, input),
    ...withResourceHandlers(
      domainMutations(projectId).create(toPendingDomain),
      withAllowanceRefresh(options, queryClient)
    ),
  });
}

export function useUpdateDomain(
  projectId: string,
  name: string,
  options?: UseMutationOptions<Domain, Error, UpdateDomainInput>
) {
  const queryClient = useQueryClient();
  const handlers = domainMutations(projectId).update<UpdateDomainInput>((input) => {
    const current = queryClient.getQueryData<Domain>(domainKeys.detail(projectId, name));
    return current ? { ...current, domainName: input.domainName } : undefined;
  });

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: UpdateDomainInput) => createDomainService().update(projectId, name, input),
    ...withResourceHandlers(handlers, options),
  });
}

export function useDeleteDomain(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (name: string) => createDomainService().delete(projectId, name),
    ...withResourceHandlers(
      domainMutations(projectId).remove<string>((name) => name),
      withAllowanceRefresh(options, queryClient)
    ),
  });
}

export function useBulkCreateDomains(
  projectId: string,
  options?: UseMutationOptions<Domain[], Error, string[]>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
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

  return useGuardedMutation({
    operation: 'write',
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
