// app/resources/dns-zones/dns-zone.watch.ts
import { toDnsZone } from './dns-zone.adapter';
import type { DnsZone } from './dns-zone.schema';
import { dnsZoneKeys } from './dns-zone.service';
import type { ComMiloapisNetworkingDnsV1Alpha1DnsZone } from '@/modules/control-plane/dns-networking';
import { useResourceWatch } from '@/modules/watch';

/**
 * Watch DNS zones list for real-time updates.
 *
 * @example
 * ```tsx
 * function DnsZonesPage() {
 *   const { data } = useDnsZones(projectId);
 *
 *   // Subscribe to live updates
 *   useDnsZonesWatch(projectId);
 *
 *   return <DnsZoneTable zones={data?.items ?? []} />;
 * }
 * ```
 */
export function useDnsZonesWatch(projectId: string, options?: { enabled?: boolean }) {
  return useResourceWatch<DnsZone>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnszones',
    projectId,
    namespace: 'default',
    queryKey: dnsZoneKeys.list(projectId),
    transform: (item) => toDnsZone(item as ComMiloapisNetworkingDnsV1Alpha1DnsZone),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Watch a single DNS zone for real-time updates.
 *
 * @example
 * ```tsx
 * function DnsZoneDetailPage() {
 *   const { data } = useDnsZone(projectId, zoneName);
 *
 *   // Subscribe to live updates
 *   useDnsZoneWatch(projectId, zoneName);
 *
 *   return <DnsZoneDetail zone={data} />;
 * }
 * ```
 */
export function useDnsZoneWatch(projectId: string, name: string, options?: { enabled?: boolean }) {
  return useResourceWatch<DnsZone>({
    resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnszones',
    projectId,
    namespace: 'default',
    name,
    queryKey: dnsZoneKeys.detail(projectId, name),
    transform: (item) => toDnsZone(item as ComMiloapisNetworkingDnsV1Alpha1DnsZone),
    enabled: options?.enabled ?? true,
  });
}
