// app/resources/dns-records/dns-record.watch.ts
import { toDnsRecordSet } from './dns-record.adapter';
import type { DnsRecordSet } from './dns-record.schema';
import { dnsRecordKeys } from './dns-record.service';
import type { ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet } from '@/modules/control-plane/dns-networking';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch DNS records list for real-time updates.
 *
 * @example
 * ```tsx
 * function DnsRecordsPage() {
 *   const { data } = useDnsRecords(projectId, dnsZoneId);
 *
 *   // Subscribe to live updates
 *   useDnsRecordsWatch(projectId, dnsZoneId);
 *
 *   return <DnsRecordTable records={data?.items ?? []} />;
 * }
 * ```
 */
export function useDnsRecordsWatch(
  projectId: string,
  dnsZoneId: string,
  options?: { enabled?: boolean; limit?: number }
) {
  const limit = options?.limit ?? 20;

  return useResourceWatch<DnsRecordSet>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnsrecordsets',
    projectId,
    namespace: 'default',
    labelSelector: `dns.networking.miloapis.com/zone-name=${dnsZoneId}`,
    queryKey: dnsRecordKeys.list(projectId, dnsZoneId, { limit }),
    transform: (item) => toDnsRecordSet(item as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single DNS record for real-time updates.
 *
 * @example
 * ```tsx
 * function DnsRecordDetailPage() {
 *   const { data } = useDnsRecord(projectId, recordSetId);
 *
 *   // Subscribe to live updates
 *   useDnsRecordWatch(projectId, recordSetId);
 *
 *   return <DnsRecordDetail record={data} />;
 * }
 * ```
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
