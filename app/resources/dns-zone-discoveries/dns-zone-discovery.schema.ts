import type { ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery } from '@/modules/control-plane/dns-networking';
import { z } from 'zod';

// DNS Zone Discovery resource schema
export const dnsZoneDiscoveryResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  resourceVersion: z.string(),
  createdAt: z.string().optional(),
  recordSets: z.any().optional(),
});

export type DnsZoneDiscovery = z.infer<typeof dnsZoneDiscoveryResourceSchema>;

// DNS Zone Discovery list schema
export const dnsZoneDiscoveryListSchema = z.object({
  items: z.array(dnsZoneDiscoveryResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type DnsZoneDiscoveryList = z.infer<typeof dnsZoneDiscoveryListSchema>;

// Input types for service operations
export type CreateDnsZoneDiscoveryInput = {
  dnsZoneId: string;
};

// Legacy interface for backward compatibility
export interface IDnsZoneDiscoveryControlResponse {
  name?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  recordSets?: NonNullable<
    NonNullable<ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery['status']>['recordSets']
  >;
}

/**
 * Individual RecordSet from DNS Zone Discovery
 */
export type IDnsZoneDiscoveryRecordSet = NonNullable<
  NonNullable<
    NonNullable<ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery['status']>['recordSets']
  >[number]
>;
