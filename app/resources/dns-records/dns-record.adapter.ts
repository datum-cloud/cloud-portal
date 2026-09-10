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
import { normalizeRecordName } from '@/utils/helpers/dns/record-comparison.helper';
import { getDnsRecordTypePriority } from '@/utils/helpers/dns/record-type.helper';
import { sanitizeForK8s } from '@/utils/helpers/format.helper';

/** Labels set by the Gateway controller when a DNSRecordSet is created for Application Load Balancer (proxy) */
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

  // Sort by DNS type priority (SOA → NS → A → AAAA → CNAME → ALIAS → MX → ...)
  // then by name within the same type. Groups records of the same type
  // together so the table reads as a logical zonefile.
  return flattened.sort((a, b) => {
    const priorityDiff =
      getDnsRecordTypePriority(a.type as SupportedDnsRecordType) -
      getDnsRecordTypePriority(b.type as SupportedDnsRecordType);
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Backwards-compatible alias for `toFlattenedDnsRecords`. Kept so external
 * callers that imported the priority-sorted variant directly keep working.
 * Both functions now apply the same type-priority sort.
 */
export function toFlattenedDnsRecordsByPriority(recordSets: DnsRecordSet[]): FlattenedDnsRecord[] {
  return toFlattenedDnsRecords(recordSets);
}

/**
 * Replace flattened list rows for one RecordSet with rows from that object.
 * Used by create/update mutations and by the RecordSet watch (cache is flattened
 * rows, watch events are whole RecordSets).
 */
export function mergeRecordSetIntoListCache(
  old: FlattenedDnsRecord[] | undefined,
  recordSet: DnsRecordSet
): FlattenedDnsRecord[] {
  const newRows = toFlattenedDnsRecords([recordSet]);
  if (!old) return newRows;
  return [...old.filter((record) => record.recordSetName !== recordSet.name), ...newRows];
}

/**
 * Drop every flattened row that belonged to a deleted RecordSet.
 */
export function removeRecordSetFromListCache(
  old: FlattenedDnsRecord[] | undefined,
  recordSetName: string
): FlattenedDnsRecord[] | undefined {
  if (!old) return old;
  return old.filter((record) => record.recordSetName !== recordSetName);
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
 * DNS-1123 owner suffix for a RecordSet resource name.
 * Apex (`@` / empty) becomes `apex` so same-type RecordSets at different
 * names do not collide on `{zone}-{type}`.
 */
export function ownerNameForResource(name: string | undefined | null): string {
  const normalized = normalizeRecordName(name);
  if (normalized === '@') return 'apex';
  if (normalized === '*') return 'wildcard';
  if (normalized.startsWith('*.')) {
    const rest = sanitizeForK8s(normalized.slice(2)).replace(/^\.+|\.+$/g, '');
    return rest ? `wildcard-${rest}` : 'wildcard';
  }
  const sanitized = sanitizeForK8s(normalized).replace(/^\.+|\.+$/g, '');
  return sanitized || 'apex';
}

/**
 * Transform CreateDnsRecordSetInput to API payload
 */
export function toCreateDnsRecordSetPayload(
  input: CreateDnsRecordSetInput,
  dnsZoneId: string
): ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet {
  const ownerName = ownerNameForResource(input.records?.[0]?.name);
  return {
    kind: 'DNSRecordSet',
    apiVersion: 'dns.networking.miloapis.com/v1alpha1',
    metadata: {
      name: `${dnsZoneId}-${input.recordType}-${ownerName}`.toLowerCase(),
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
