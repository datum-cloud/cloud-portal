import { type DNSRecordType } from './constants';
import { formatSvcbParams, getDnsRecordTypePriority } from './record-type.helper';
import { IExtendedControlPlaneStatus } from '@/resources/base';
import { IDnsRecordSetControlResponse, IFlattenedDnsRecord } from '@/resources/dns-records';
import { IDnsZoneDiscoveryRecordSet } from '@/resources/dns-zone-discoveries';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';

// =============================================================================
// Flattening Functions: Transform K8s schemas to UI-friendly format
// =============================================================================

/**
 * Transform K8s DNSRecordSet array to flattened records for UI display
 * Each record in spec.records[] becomes a separate table row
 *
 * @overload For managed DNS RecordSets
 */
export function flattenDnsRecordSets(
  recordSets: IDnsRecordSetControlResponse[]
): IFlattenedDnsRecord[];

/**
 * Transform DNS Zone Discovery recordSets to flattened records for UI display
 *
 * @overload For discovered DNS records
 */
export function flattenDnsRecordSets(
  recordSets: IDnsZoneDiscoveryRecordSet[],
  dnsZoneId: string
): IFlattenedDnsRecord[];

/**
 * Implementation: Handles both DNSRecordSet and Discovery schemas
 */
export function flattenDnsRecordSets(
  recordSets: any[],
  dnsZoneIdOrUndefined?: string
): IFlattenedDnsRecord[] {
  // Detect if it's discovery by checking second parameter
  const isDiscovery = typeof dnsZoneIdOrUndefined === 'string';

  if (isDiscovery) {
    return flattenDiscoveryRecordSets(recordSets, dnsZoneIdOrUndefined);
  }

  return flattenManagedRecordSets(recordSets);
}

/**
 * Flatten managed DNS RecordSets (from DNSRecordSet resources)
 */
function flattenManagedRecordSets(
  recordSets: IDnsRecordSetControlResponse[]
): IFlattenedDnsRecord[] {
  const flattened: IFlattenedDnsRecord[] = [];

  recordSets.forEach((recordSet) => {
    const records = recordSet.records || [];

    // Use unified transformer with DNS-specific options
    const statusInfo = transformControlPlaneStatus(recordSet.status, {
      requiredConditions: ['Accepted', 'Programmed'],
      includeConditionDetails: true,
    });

    const entries = flattenRecordEntries(recordSet.recordType || '', records, {
      recordSetId: recordSet.uid || '',
      recordSetName: recordSet.name || '',
      createdAt: recordSet.createdAt || new Date(),
      dnsZoneId: recordSet.dnsZoneId || '',
      status: statusInfo,
    });

    flattened.push(...entries);
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
 * Flatten DNS Zone Discovery recordSets
 */
function flattenDiscoveryRecordSets(
  recordSets: IDnsZoneDiscoveryRecordSet[],
  dnsZoneId: string
): IFlattenedDnsRecord[] {
  const flattened: IFlattenedDnsRecord[] = [];

  recordSets.forEach((recordSet) => {
    const records = recordSet.records || [];

    const entries = flattenRecordEntries(recordSet.recordType || '', records, {
      dnsZoneId: dnsZoneId,
      // No recordSetId, recordSetName, createdAt, status for discovery
    });

    flattened.push(...entries);
  });

  // Sort by type priority, then by name
  return flattened.sort((a, b) => {
    const priorityDiff = getDnsRecordTypePriority(a.type) - getDnsRecordTypePriority(b.type);
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Shared helper: Flatten record entries with given metadata
 */
function flattenRecordEntries(
  recordType: string,
  records: any[],
  metadata: {
    recordSetId?: string;
    recordSetName?: string;
    createdAt?: Date;
    dnsZoneId: string;
    status?: IExtendedControlPlaneStatus;
  }
): IFlattenedDnsRecord[] {
  const flattened: IFlattenedDnsRecord[] = [];

  records.forEach((record: any) => {
    const value = extractValue(record, recordType);
    const ttl = extractTTL(record);

    flattened.push({
      ...metadata,
      type: recordType as DNSRecordType,
      name: record.name || '',
      value: value,
      ttl: ttl,
      rawData: record,
    });
  });

  return flattened;
}

/**
 * Extract value from a record based on its type
 * Returns a single string value to be displayed in the UI
 * Reference: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['records']
 */
export function extractValue(record: any, recordType: string | undefined): string {
  switch (recordType) {
    case 'A':
      // record.a.content: string (single value)
      return record.a?.content || '';

    case 'AAAA':
      // record.aaaa.content: string (single value)
      return record.aaaa?.content || '';

    case 'CNAME':
      // record.cname.content: string (single value)
      return record.cname?.content || '';

    case 'ALIAS':
      // record.alias.content: string (single value)
      return record.alias?.content || '';

    case 'TXT':
      // record.txt.content: string (single value)
      return record.txt?.content || '';

    case 'NS':
      // record.ns.content: string (single value)
      return record.ns?.content || '';

    case 'PTR':
      // record.ptr.content: string (single value)
      return record.ptr?.content || '';

    case 'SOA':
      // record.soa: { mname, rname, refresh, retry, expire, serial, ttl }
      // Return as JSON string to preserve object structure for editing
      // Format will be applied in table cell renderer
      return record.soa ? JSON.stringify(record.soa) : '';

    case 'MX':
      // record.mx: { exchange: string, preference: number } (single object)
      // Format: "preference|exchange" (pipe separator for UI parsing)
      return record.mx ? `${record.mx.preference}|${record.mx.exchange}` : '';

    case 'SRV':
      // record.srv: { priority, weight, port, target } (single object)
      // Format: "priority weight port target"
      return record.srv
        ? `${record.srv.priority} ${record.srv.weight} ${record.srv.port} ${record.srv.target}`
        : '';

    case 'CAA':
      // record.caa: { flag, tag, value } (single object)
      // Format: "flag tag value"
      return record.caa ? `${record.caa.flag} ${record.caa.tag} "${record.caa.value}"` : '';

    case 'TLSA':
      // record.tlsa: { usage, selector, matchingType, certData } (single object)
      // Format: "usage selector matchingType certData"
      return record.tlsa
        ? `${record.tlsa.usage} ${record.tlsa.selector} ${record.tlsa.matchingType} ${record.tlsa.certData}`
        : '';

    case 'HTTPS':
      // record.https: { priority, target, params } (single object)
      // Format: "priority target [params]"
      if (!record.https) return '';
      const httpsParams = formatSvcbParams(record.https.params);
      return `${record.https.priority} ${record.https.target}${httpsParams ? ` ${httpsParams}` : ''}`;

    case 'SVCB':
      // record.svcb: { priority, target, params } (single object)
      // Format: "priority target [params]"
      if (!record.svcb) return '';
      const svcbParams = formatSvcbParams(record.svcb.params);
      return `${record.svcb.priority} ${record.svcb.target}${svcbParams ? ` ${svcbParams}` : ''}`;

    default:
      // Fallback to content if available
      return record.content || '';
  }
}

/**
 * Extract TTL from record
 * Handles both bigint and number types, converting bigint to number for UI display
 */
function extractTTL(record: any): number | undefined {
  // TTL can be bigint or number in the new schema
  if (record.ttl !== undefined && record.ttl !== null) {
    // Convert bigint to number if needed
    return typeof record.ttl === 'bigint' ? Number(record.ttl) : record.ttl;
  }

  return undefined;
}

/**
 * Check if a record has no value
 * With the new schema, each record contains a single value (not arrays)
 */
export function isRecordEmpty(record: any, recordType: string): boolean {
  switch (recordType) {
    case 'A':
      return !record.a?.content;
    case 'AAAA':
      return !record.aaaa?.content;
    case 'CNAME':
      return !record.cname?.content;
    case 'ALIAS':
      return !record.alias?.content;
    case 'TXT':
      return !record.txt?.content;
    case 'NS':
      return !record.ns?.content;
    case 'PTR':
      return !record.ptr?.content;
    case 'SOA':
      return !record.soa;
    case 'MX':
      return !record.mx;
    case 'SRV':
      return !record.srv;
    case 'CAA':
      return !record.caa;
    case 'TLSA':
      return !record.tlsa;
    case 'HTTPS':
      return !record.https;
    case 'SVCB':
      return !record.svcb;
    default:
      return true;
  }
}
