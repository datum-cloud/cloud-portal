import {
  ComMiloapisNetworkingDnsV1Alpha1DnsZone,
  ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet,
  ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery,
} from '@/modules/control-plane/dns-networking';
import { ComDatumapisNetworkingV1AlphaDomain } from '@/modules/control-plane/networking';

// ============================================
// DNS Zone Interfaces
// ============================================
export interface IDnsZoneControlResponse {
  name?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  namespace?: string;
  domainName?: string;
  description?: string;
  dnsZoneClassName?: string;
  status?: ComMiloapisNetworkingDnsV1Alpha1DnsZone['status'];
}

// ============================================
// DNS Zone Discovery Interfaces
// ============================================
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
 * Extracted from IDnsZoneDiscoveryControlResponse['recordSets'][number]
 */
export type IDnsZoneDiscoveryRecordSet = NonNullable<
  NonNullable<
    NonNullable<ComMiloapisNetworkingDnsV1Alpha1DnsZoneDiscovery['status']>['recordSets']
  >[number]
>;

// ============================================
// DNS Record Set Interfaces
// ============================================
export interface IDnsRecordSetControlResponse {
  name?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  dnsZoneId?: string;
  recordType?: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['recordType'];
  records?: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['records'];
  status?: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['status'];
}

// ============================================
// Flattened DNS Record for UI Display
// Each VALUE in each record becomes a separate row
// Supports both DNSRecordSet (managed) and Discovery records
// ============================================
export interface IFlattenedDnsRecord {
  // RecordSet metadata (optional for discovery records)
  recordSetId?: string;
  recordSetName?: string;
  createdAt?: Date;
  dnsZoneId: string;

  // Record details (always present)
  type: string;
  name: string;
  value: string; // Single value per row (MX format: "preference|exchange")
  ttl?: number;

  // Status (only for managed recordsets, undefined for discovery)
  status?: 'Active' | 'Pending' | 'Error';

  // Raw data for editing/display
  rawData: any;
}

// ============================================
// Nameserver Interfaces (Shared between Domain & DNS Zone)
// ============================================
export type IDnsNameserver = NonNullable<
  NonNullable<NonNullable<ComDatumapisNetworkingV1AlphaDomain['status']>['nameservers']>[number]
>;

export type IDnsRegistration = NonNullable<
  NonNullable<ComDatumapisNetworkingV1AlphaDomain['status']>['registration']
>;
