// app/resources/dns-records/dns-record.watch.ts
import {
  mergeRecordSetIntoListCache,
  removeRecordSetFromListCache,
  toDnsRecordSet,
} from './dns-record.adapter';
import type { DnsRecordSet, FlattenedDnsRecord } from './dns-record.schema';
import { dnsRecordKeys } from './dns-record.service';
import type { ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet } from '@/modules/control-plane/dns-networking';
import { useResourceWatch } from '@/modules/watch';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Watch DNS records list for real-time updates.
 *
 * The list query stores flattened rows, but the API watches DNSRecordSet
 * objects. Default watch cache updates would either refetch (and race a
 * delete) or splice a RecordSet into the flattened array. Apply events
 * ourselves instead.
 */
export function useDnsRecordsWatch(
  projectId: string,
  dnsZoneId: string,
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const queryKey = dnsRecordKeys.list(projectId, dnsZoneId);

  return useResourceWatch<DnsRecordSet>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnsrecordsets',
    projectId,
    namespace: 'default',
    fieldSelector: `spec.dnsZoneRef.name=${dnsZoneId}`,
    queryKey,
    transform: (item) => toDnsRecordSet(item as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet),
    enabled: options?.enabled ?? true,
    throttleMs: 500,
    debounceMs: 100,
    skipInitialSync: false,
    applyCacheUpdates: false,
    onEvent: (event) => {
      if (event.type === 'DELETED') {
        queryClient.setQueryData<FlattenedDnsRecord[]>(queryKey, (old) =>
          removeRecordSetFromListCache(old, event.object.name)
        );
        return;
      }
      if (event.type === 'ADDED' || event.type === 'MODIFIED') {
        queryClient.setQueryData<FlattenedDnsRecord[]>(queryKey, (old) =>
          mergeRecordSetIntoListCache(old, event.object)
        );
      }
    },
  });
}

/**
 * Watch a single DNS record for real-time updates.
 */
export function useDnsRecordWatch(
  projectId: string,
  recordSetId: string,
  options?: { enabled?: boolean }
) {
  return useResourceWatch<DnsRecordSet>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnsrecordsets',
    projectId,
    namespace: 'default',
    name: recordSetId,
    queryKey: dnsRecordKeys.detail(projectId, recordSetId),
    transform: (item) => toDnsRecordSet(item as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet),
    enabled: options?.enabled ?? true,
  });
}
