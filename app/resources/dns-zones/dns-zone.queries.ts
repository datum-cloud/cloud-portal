import type { DnsZone, CreateDnsZoneInput, UpdateDnsZoneInput } from './dns-zone.schema';
import { DNS_ZONE_SYNC_KIND, createDnsZoneService, dnsZoneKeys } from './dns-zone.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import {
  defineResourceMutations,
  withResourceHandlers,
} from '@/modules/watch/define-resource-mutations';
import { withAllowanceRefresh } from '@/resources/allowance-buckets';
import type { PaginationParams } from '@/resources/base/base.schema';
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useDnsZones(
  projectId: string,
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<DnsZone[]>, 'queryKey' | 'queryFn'>
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
  options?: Omit<UseQueryOptions<DnsZone[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dnsZoneKeys.byDomainRef(projectId, domainRef),
    queryFn: () => createDnsZoneService().listByDomainRef(projectId, domainRef),
    enabled: !!(projectId && domainRef),
    ...options,
  });
}

/** Zones are watched: mutations write the lists and never invalidate them. */
export function dnsZoneMutations(projectId: string) {
  return defineResourceMutations<DnsZone>({
    kind: DNS_ZONE_SYNC_KIND,
    scope: projectId,
    keys: {
      lists: [...dnsZoneKeys.lists(), projectId],
      detail: (name) => dnsZoneKeys.detail(projectId, name),
    },
    getName: (zone) => zone.name,
    getMeta: (zone) => ({
      name: zone.name,
      resourceVersion: zone.resourceVersion,
      deletionTimestamp: zone.deletionTimestamp,
    }),
    watched: true,
  });
}

export function toPendingDnsZone(input: CreateDnsZoneInput, pendingName: string): DnsZone {
  return {
    uid: pendingName,
    name: pendingName,
    namespace: 'default',
    displayName: input.domainName,
    description: input.description,
    resourceVersion: '',
    createdAt: new Date(),
    domainName: input.domainName,
    dnsZoneClassName: '',
    status: {},
  };
}

export function useCreateDnsZone(
  projectId: string,
  options?: UseMutationOptions<DnsZone, Error, CreateDnsZoneInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: CreateDnsZoneInput) => createDnsZoneService().create(projectId, input),
    ...withResourceHandlers(
      dnsZoneMutations(projectId).create(toPendingDnsZone),
      withAllowanceRefresh(options, queryClient)
    ),
  });
}

export function useUpdateDnsZone(
  projectId: string,
  name: string,
  options?: UseMutationOptions<DnsZone, Error, UpdateDnsZoneInput>
) {
  const queryClient = useQueryClient();
  const handlers = dnsZoneMutations(projectId).update<UpdateDnsZoneInput>((input) => {
    const current = queryClient.getQueryData<DnsZone>(dnsZoneKeys.detail(projectId, name));
    return current ? { ...current, description: input.description } : undefined;
  });

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (input: UpdateDnsZoneInput) =>
      createDnsZoneService().update(projectId, name, input),
    ...withResourceHandlers(handlers, options),
  });
}

/** Rows stay "Deleting…" until the watch reports them; a refetch mid-finalization revives them. */
export function useDeleteDnsZone(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (name: string) => createDnsZoneService().delete(projectId, name),
    ...withResourceHandlers(
      dnsZoneMutations(projectId).remove<string>((name) => name),
      withAllowanceRefresh(options, queryClient)
    ),
  });
}
