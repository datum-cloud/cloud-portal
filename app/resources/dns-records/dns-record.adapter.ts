import {
  type DnsRecordSet,
  type DnsRecordSetList,
  type SupportedDnsRecordType,
  type FlattenedDnsRecord,
  type CreateDnsRecordSetInput,
} from './dns-record.schema';
import { ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet } from '@/modules/control-plane/dns-networking';
import { ControlPlaneStatus } from '@/resources/base';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { extractValue } from '@/utils/helpers/dns/flatten.helper';
import { getDnsRecordTypePriority } from '@/utils/helpers/dns/record-type.helper';

/** Labels set by the Gateway controller when a DNSRecordSet is created for AI Edge (proxy) */
const DNS_SOURCE_KIND_LABEL = 'dns.datumapis.com/source-kind';
const DNS_SOURCE_NAME_LABEL = 'dns.datumapis.com/source-name';

/**
 * Transform raw API DNS RecordSet to domain DnsRecordSet
 */
export function toDnsRecordSet(raw: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet): DnsRecordSet {
  const labels = raw.metadata?.labels ?? {};
  const sourceKind = labels[DNS_SOURCE_KIND_LABEL];
  const managedByGateway = sourceKind === 'Gateway';
  const gatewaySourceName = managedByGateway ? labels[DNS_SOURCE_NAME_LABEL] : undefined;

  return {
    uid: raw.metadata?.uid ?? '',
    name: raw.metadata?.name ?? '',
    namespace: raw.metadata?.namespace ?? '',
    description: raw.metadata?.annotations?.['kubernetes.io/description'],
    resourceVersion: raw.metadata?.resourceVersion ?? '',
    createdAt: raw.metadata?.creationTimestamp ?? new Date(),
    dnsZoneId: raw.spec?.dnsZoneRef?.name ?? '',
    recordType: raw.spec?.recordType ?? '',
    records: raw.spec?.records ?? [],
    status: raw.status,
    managedByGateway,
    gatewaySourceName,
  };
}

/**
 * Transform raw API list to domain DnsRecordSetList
 */
export function toDnsRecordSetList(
  items: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet[],
  nextCursor?: string
): DnsRecordSetList {
  return {
    items: items.map(toDnsRecordSet),
    nextCursor: nextCursor ?? null,
    hasMore: !!nextCursor,
  };
}

/**
 * Transform DnsRecordSet list to flattened records for UI display
 * Each record in spec.records[] becomes a separate row
 */
export function toFlattenedDnsRecords(recordSets: DnsRecordSet[]): FlattenedDnsRecord[] {
  const flattened: FlattenedDnsRecord[] = [];

  recordSets.forEach((recordSet) => {
    const records = recordSet.records || [];

    // Use unified transformer with DNS-specific options for the record set as a whole.
    const recordSetStatus = transformControlPlaneStatus(recordSet.status, {
      requiredConditions: ['Accepted', 'Programmed'],
      includeConditionDetails: true,
    });

    records.forEach((record: any) => {
      const value = extractValue(record, recordSet.recordType);
      const ttl = extractTTL(record);

      // Build per-record status by looking up status.recordSets[record.name].conditions.
      // The top-level Programmed condition is an aggregate across all records in the set —
      // each flattened row needs the status of its specific record entry.
      const recordStatus = { ...recordSetStatus };
      if (record.name && recordSetStatus.recordSets?.length) {
        const perRecord = recordSetStatus.recordSets.find((rs) => rs.name === record.name);
        const cond = perRecord?.conditions?.find((c) => c.type === 'Programmed');
        if (cond) {
          recordStatus.isProgrammed = cond.status === 'True';
          recordStatus.programmedReason = cond.reason;
          if (cond.status !== 'True') {
            recordStatus.status = ControlPlaneStatus.Pending;
            recordStatus.message = cond.message;
          } else {
            recordStatus.status = ControlPlaneStatus.Success;
            recordStatus.message = '';
          }
        }
      }

      flattened.push({
        recordSetId: recordSet.uid,
        recordSetName: recordSet.name,
        createdAt: recordSet.createdAt,
        dnsZoneId: recordSet.dnsZoneId,
        type: recordSet.recordType as SupportedDnsRecordType,
        name: record.name || '',
        value: value,
        ttl: ttl,
        status: recordStatus,
        rawData: record,
        managedByGateway: recordSet.managedByGateway,
        gatewaySourceName: recordSet.gatewaySourceName,
      });
    });
  });

  // Sort descending by createdAt (most recent first), then by name for same timestamp
  return flattened.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Transform DnsRecordSet list to flattened records sorted by type priority
 * Used for discovery preview where type priority matters more than creation date
 */
export function toFlattenedDnsRecordsByPriority(recordSets: DnsRecordSet[]): FlattenedDnsRecord[] {
  const flattened = toFlattenedDnsRecords(recordSets);

  // Sort by type priority, then by name
  return flattened.sort((a, b) => {
    const priorityDiff =
      getDnsRecordTypePriority(a.type as SupportedDnsRecordType) -
      getDnsRecordTypePriority(b.type as SupportedDnsRecordType);
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Extract TTL from record
 */
function extractTTL(record: any): number | undefined {
  if (record.ttl !== undefined && record.ttl !== null) {
    return typeof record.ttl === 'bigint' ? Number(record.ttl) : record.ttl;
  }
  return undefined;
}

/**
 * Transform CreateDnsRecordSetInput to API payload
 */
export function toCreateDnsRecordSetPayload(
  input: CreateDnsRecordSetInput,
  dnsZoneId: string
): ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet {
  return {
    kind: 'DNSRecordSet',
    apiVersion: 'dns.networking.miloapis.com/v1alpha1',
    metadata: {
      name: `${dnsZoneId}-${input.recordType}`.toLowerCase(),
    },
    spec: {
      dnsZoneRef: input.dnsZoneRef,
      recordType: input.recordType as any,
      records: input.records,
    },
  };
}

/**
 * Transform update input to API payload (partial spec for PATCH)
 */
export function toUpdateDnsRecordSetPayload(
  records: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['records']
): {
  kind: string;
  apiVersion: string;
  spec: { records: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['records'] };
} {
  return {
    kind: 'DNSRecordSet',
    apiVersion: 'dns.networking.miloapis.com/v1alpha1',
    spec: {
      records,
    },
  };
}
