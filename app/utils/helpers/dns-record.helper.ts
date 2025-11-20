import { ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet } from '@/modules/control-plane/dns-networking';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
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

/**
 * Parse SVCB/HTTPS params string into key-value object
 * Example: 'alpn="h3,h2" ipv4hint="127.0.0.1"' -> { alpn: "h3,h2", ipv4hint: "127.0.0.1" }
 */
export function parseSvcbParams(input?: string): Record<string, string> {
  if (!input?.trim()) return {};

  const params: Record<string, string> = {};
  // Match key="value" or key=value patterns
  const regex = /(\w+)=(?:"([^"]*)"|(\S+))/g;
  let match;

  while ((match = regex.exec(input)) !== null) {
    const key = match[1];
    const value = match[2] || match[3];
    params[key] = value;
  }

  return params;
}

/**
 * Format SVCB/HTTPS params object to string representation
 * Example: { alpn: "h3,h2", ipv4hint: "127.0.0.1" } -> 'alpn="h3,h2" ipv4hint="127.0.0.1"'
 */
export function formatSvcbParams(params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return '';

  return Object.entries(params)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
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
    const { status, message, isProgrammed, programmedReason } = extractStatus(recordSet.status);

    const entries = flattenRecordEntries(recordSet.recordType || '', records, {
      recordSetId: recordSet.uid || '',
      recordSetName: recordSet.name || '',
      createdAt: recordSet.createdAt || new Date(),
      dnsZoneId: recordSet.dnsZoneId || '',
      status: status,
      statusMessage: message,
      isProgrammed,
      programmedReason,
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
    status?: ControlPlaneStatus;
    statusMessage?: string;
    isProgrammed?: boolean;
    programmedReason?: string;
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
 * Extract status and message from K8s conditions
 * Similar to transformControlPlaneStatus in control-plane.helper.ts
 *
 * Status logic:
 * - Active: All conditions (Accepted AND Programmed) are True
 * - Pending: Any condition is not True (includes False, missing, etc.)
 *
 * Message: Only returned when Pending (to explain why it's pending)
 */
function extractStatus(status: any): {
  status: ControlPlaneStatus;
  message?: string;
  isProgrammed?: boolean;
  programmedReason?: string;
} {
  if (!status?.conditions || status.conditions.length === 0) {
    return {
      status: ControlPlaneStatus.Pending,
      message: 'Resource is being provisioned...',
    };
  }

  const accepted = status.conditions.find((c: any) => c.type === 'Accepted');
  const programmed = status.conditions.find((c: any) => c.type === 'Programmed');

  const isAccepted = accepted?.status === 'True';
  const isProgrammed = programmed?.status === 'True';

  // Both conditions are True - resource is active (Success)
  if (isAccepted && isProgrammed) {
    return {
      status: ControlPlaneStatus.Success,
      isProgrammed: true,
      programmedReason: programmed?.reason,
    };
  }

  // At least one condition is not True - resource is pending
  // Collect messages from non-True conditions to explain why pending
  const messages: string[] = [];

  if (!isAccepted && accepted) {
    messages.push(accepted.message || 'Awaiting acceptance');
  }

  if (!isProgrammed && programmed) {
    messages.push(programmed.message || 'Awaiting programming');
  }

  return {
    status: ControlPlaneStatus.Pending,
    message: messages.length > 0 ? messages.join('; ') : 'Resource is being provisioned...',
    isProgrammed,
    programmedReason: programmed?.reason,
  };
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
      // Form: { https: { priority, target, params: string } }
      // K8s:  { https: { priority, target, params: Record<string, string> } }
      if (typeData.https) {
        record.https = {
          priority: typeData.https.priority,
          target: typeData.https.target,
          params: parseSvcbParams(typeData.https.params),
        };
      }
      break;

    case 'SVCB':
      // Form: { svcb: { priority, target, params: string } }
      // K8s:  { svcb: { priority, target, params: Record<string, string> } }
      if (typeData.svcb) {
        record.svcb = {
          priority: typeData.svcb.priority,
          target: typeData.svcb.target,
          params: parseSvcbParams(typeData.svcb.params),
        };
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
 * Transform flattened DNS record to form default value
 * Inverse of transformFormToRecord() - converts IFlattenedDnsRecord → CreateDnsRecordSchema
 *
 * Used when editing existing records in both inline and modal forms
 */
export function recordToFormDefaultValue(
  record: IFlattenedDnsRecord
): Omit<CreateDnsRecordSchema, 'dnsZoneRef'> {
  const base = {
    recordType: record.type as any,
    name: record.name,
    ttl: record.ttl,
  };

  // Use rawData (K8s record) to reconstruct form values
  const rawData = record.rawData;

  switch (record.type) {
    // Simple types - extract from value string
    case 'A':
      return { ...base, a: { content: record.value || '' } } as any;
    case 'AAAA':
      return { ...base, aaaa: { content: record.value || '' } } as any;
    case 'CNAME':
      return { ...base, cname: { content: record.value || '' } } as any;
    case 'TXT':
      return { ...base, txt: { content: record.value || '' } } as any;
    case 'NS':
      return { ...base, ns: { content: record.value || '' } } as any;
    case 'PTR':
      return { ...base, ptr: { content: record.value || '' } } as any;

    // Complex types - use rawData (K8s format)
    case 'MX':
      return {
        ...base,
        mx: rawData?.mx || { exchange: '', preference: 10 },
      } as any;
    case 'SRV':
      return {
        ...base,
        srv: rawData?.srv || { target: '', port: 443, priority: 10, weight: 5 },
      } as any;
    case 'CAA':
      return {
        ...base,
        caa: rawData?.caa || { flag: 0, tag: 'issue', value: '' },
      } as any;
    case 'TLSA':
      return {
        ...base,
        tlsa: rawData?.tlsa || { usage: 3, selector: 1, matchingType: 1, certData: '' },
      } as any;

    // HTTPS/SVCB - convert params object → string
    case 'HTTPS':
      return {
        ...base,
        https: rawData?.https
          ? {
              priority: rawData.https.priority,
              target: rawData.https.target,
              params: formatSvcbParams(rawData.https.params),
            }
          : { priority: 1, target: '', params: '' },
      } as any;
    case 'SVCB':
      return {
        ...base,
        svcb: rawData?.svcb
          ? {
              priority: rawData.svcb.priority,
              target: rawData.svcb.target,
              params: formatSvcbParams(rawData.svcb.params),
            }
          : { priority: 1, target: '', params: '' },
      } as any;

    // SOA - parse JSON value
    case 'SOA':
      try {
        const soa = JSON.parse(record.value || '{}');
        return {
          ...base,
          soa: {
            mname: soa.mname || '',
            rname: soa.rname || '',
            refresh: soa.refresh || 3600,
            retry: soa.retry || 600,
            expire: soa.expire || 86400,
            ttl: soa.ttl || 3600,
          },
        } as any;
      } catch {
        return {
          ...base,
          soa: {
            mname: '',
            rname: '',
            refresh: 3600,
            retry: 600,
            expire: 86400,
            ttl: 3600,
          },
        } as any;
      }

    default:
      return base as any;
  }
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
