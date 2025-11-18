import { ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet } from '@/modules/control-plane/dns-networking';
import {
  IDnsRecordSetControlResponse,
  IDnsZoneDiscoveryRecordSet,
  IFlattenedDnsRecord,
} from '@/resources/interfaces/dns.interface';
import { CreateDnsRecordSchema } from '@/resources/schemas/dns-record.schema';

/**
 * Get sort priority for DNS record types
 * Lower numbers appear first in sorted lists
 */
export function getDnsRecordTypePriority(recordType: string): number {
  const priorities: Record<string, number> = {
    SOA: 1,
    NS: 2,
    A: 3,
    AAAA: 4,
    CNAME: 5,
    MX: 6,
    TXT: 7,
    SRV: 8,
    CAA: 9,
    PTR: 10,
    TLSA: 11,
    HTTPS: 12,
    SVCB: 13,
  };

  return priorities[recordType] || 999;
}

/**
 * Convert TTL (in seconds) to human-readable format
 * Examples: 3600 -> "1 hr", 300 -> "5 min", 86400 -> "1 day"
 */
export function formatTTL(ttlSeconds?: number): string {
  if (!ttlSeconds) return 'Auto';

  const days = Math.floor(ttlSeconds / 86400);
  const hours = Math.floor((ttlSeconds % 86400) / 3600);
  const minutes = Math.floor((ttlSeconds % 3600) / 60);
  const seconds = ttlSeconds % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds} sec${seconds > 1 ? 's' : ''}`);

  // Return first two most significant units
  return parts.slice(0, 2).join(' ');
}

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
    const status = extractStatus(recordSet.status);

    const entries = flattenRecordEntries(recordSet.recordType || '', records, {
      recordSetId: recordSet.uid || '',
      recordSetName: recordSet.name || '',
      createdAt: recordSet.createdAt || new Date(),
      dnsZoneId: recordSet.dnsZoneId || '',
      status: status,
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
    status?: 'Active' | 'Pending' | 'Error';
  }
): IFlattenedDnsRecord[] {
  const flattened: IFlattenedDnsRecord[] = [];

  records.forEach((record: any) => {
    const value = extractValue(record, recordType);
    const ttl = extractTTL(record);

    flattened.push({
      ...metadata,
      type: recordType,
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
      const httpsParams = record.https.params
        ? ` ${Object.entries(record.https.params)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')}`
        : '';
      return `${record.https.priority} ${record.https.target}${httpsParams}`;

    case 'SVCB':
      // record.svcb: { priority, target, params } (single object)
      // Format: "priority target [params]"
      if (!record.svcb) return '';
      const svcbParams = record.svcb.params
        ? ` ${Object.entries(record.svcb.params)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')}`
        : '';
      return `${record.svcb.priority} ${record.svcb.target}${svcbParams}`;

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
 * Extract status from K8s conditions
 */
function extractStatus(status: any): 'Active' | 'Pending' | 'Error' {
  if (!status?.conditions) return 'Pending';

  const accepted = status.conditions.find((c: any) => c.type === 'Accepted');
  const programmed = status.conditions.find((c: any) => c.type === 'Programmed');

  const isAccepted = accepted?.status === 'True';
  const isProgrammed = programmed?.status === 'True';

  if (isAccepted && isProgrammed) return 'Active';
  if (accepted?.status === 'False' || programmed?.status === 'False') return 'Error';
  return 'Pending';
}

// =============================================================================
// Transformation Helpers: Form ↔ K8s RecordSet
// =============================================================================

/**
 * Transform UI form data to K8s Record format
 * Converts CreateDnsRecordSchema to DNSRecordSet['spec']['records'][0]
 */
export function transformFormToRecord(
  formData: CreateDnsRecordSchema
): ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['records'][0] {
  const { recordType, name, ttl, ...typeData } = formData as any;

  const record: any = {
    name: name || '@',
    // Only include ttl if it's not null/undefined (null means "Auto" - use default TTL)
    ...(ttl != null && { ttl }),
  };

  // Map type-specific fields to K8s format
  switch (recordType) {
    case 'A':
      // Form: { a: { content: string } }
      // K8s:  { a: { content: string } }
      if (typeData.a) {
        record.a = { content: typeData.a.content };
      }
      break;

    case 'AAAA':
      // Form: { aaaa: { content: string } }
      // K8s:  { aaaa: { content: string } }
      if (typeData.aaaa) {
        record.aaaa = { content: typeData.aaaa.content };
      }
      break;

    case 'CNAME':
      // Form: { cname: { content: string } }
      // K8s:  { cname: { content: string } }
      if (typeData.cname) {
        record.cname = { content: typeData.cname.content };
      }
      break;

    case 'TXT':
      // Form: { txt: { content: string } }
      // K8s:  { txt: { content: string } }
      if (typeData.txt) {
        record.txt = { content: typeData.txt.content };
      }
      break;

    case 'NS':
      // Form: { ns: { content: string } }
      // K8s:  { ns: { content: string } }
      if (typeData.ns) {
        record.ns = { content: typeData.ns.content };
      }
      break;

    case 'PTR':
      // Form: { ptr: { content: string } }
      // K8s:  { ptr: { content: string } }
      if (typeData.ptr) {
        record.ptr = { content: typeData.ptr.content };
      }
      break;

    case 'MX':
      // Form: { mx: { exchange, preference } }
      // K8s:  { mx: { exchange, preference } }
      if (typeData.mx) {
        record.mx = typeData.mx;
      }
      break;

    case 'SRV':
      // Form: { srv: { priority, weight, port, target } }
      // K8s:  { srv: { priority, weight, port, target } }
      if (typeData.srv) {
        record.srv = typeData.srv;
      }
      break;

    case 'CAA':
      // Form: { caa: { flag, tag, value } }
      // K8s:  { caa: { flag, tag, value } }
      if (typeData.caa) {
        record.caa = typeData.caa;
      }
      break;

    case 'TLSA':
      // Form: { tlsa: { usage, selector, matchingType, certData } }
      // K8s:  { tlsa: { usage, selector, matchingType, certData } }
      if (typeData.tlsa) {
        record.tlsa = typeData.tlsa;
      }
      break;

    case 'HTTPS':
      // Form: { https: { priority, target, params } }
      // K8s:  { https: { priority, target, params } }
      if (typeData.https) {
        record.https = typeData.https;
      }
      break;

    case 'SVCB':
      // Form: { svcb: { priority, target, params } }
      // K8s:  { svcb: { priority, target, params } }
      if (typeData.svcb) {
        record.svcb = typeData.svcb;
      }
      break;

    case 'SOA':
      // Form: { soa: { mname, rname, ... } }
      // K8s:  { soa: { mname, rname, ... } }
      if (typeData.soa) {
        record.soa = typeData.soa;
      }
      break;
  }

  return record;
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
