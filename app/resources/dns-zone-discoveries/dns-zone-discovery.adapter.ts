import type { DnsZoneDiscovery, DnsZoneDiscoveryList } from './dns-zone-discovery.schema';
import type { ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery } from '@/modules/control-plane/dns-networking';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';

/**
 * Transform raw API DnsZoneDiscovery to domain DnsZoneDiscovery type
 */
export function toDnsZoneDiscovery(
  raw: ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery
): DnsZoneDiscovery {
  const { metadata, status } = raw;
  return {
    uid: metadata?.uid ?? '',
    name: metadata?.name ?? '',
    resourceVersion: metadata?.resourceVersion ?? '',
    createdAt: metadata?.creationTimestamp
      ? new Date(metadata.creationTimestamp).toISOString()
      : undefined,
    recordSets: status?.recordSets,
  };
}

/**
 * Transform raw API list to domain DnsZoneDiscoveryList
 */
export function toDnsZoneDiscoveryList(
  items: ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery[],
  nextCursor?: string
): DnsZoneDiscoveryList {
  return {
    items: items.map(toDnsZoneDiscovery),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}

/**
 * Generate a unique name for DNS zone discovery
 */
export function generateDnsZoneDiscoveryName(dnsZoneId: string): string {
  return `dns-zone-discovery-${generateId(dnsZoneId, { randomText: generateRandomString(6) })}`;
}

/**
 * Transform CreateDnsZoneDiscoveryInput to API create payload
 */
export function toCreateDnsZoneDiscoveryPayload(
  dnsZoneId: string
): ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery {
  return {
    kind: 'DNSZoneDiscovery',
    apiVersion: 'dns.networking.miloapis.com/v1alpha1',
    metadata: {
      name: generateDnsZoneDiscoveryName(dnsZoneId),
    },
    spec: {
      dnsZoneRef: {
        name: dnsZoneId,
      },
    },
  };
}
