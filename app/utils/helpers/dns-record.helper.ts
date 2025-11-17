import { IDnsRecordSetControlResponse } from '@/resources/interfaces/dns.interface';

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
 * Flattened DNS record for UI display
 * Each VALUE in each record becomes a separate row
 */
export interface IFlattenedDnsRecord {
  // RecordSet metadata
  recordSetId: string;
  recordSetName: string;
  createdAt: Date;
  dnsZoneId: string;

  // Record details
  type: string; // Record type (NS, A, AAAA, CNAME, MX, etc.)
  name: string; // Record name (recordSet name, not record.name)
  value: string; // Single value (MX format: "preference|exchange")
  ttl?: number; // TTL if available

  // Status
  status: 'Active' | 'Pending' | 'Error';

  // Raw data for editing
  rawData: any;
}

/**
 * Transform K8s DNSRecordSet array to flattened records for UI display
 * Each value in spec.records[].raw/soa/mx/etc becomes a separate table row
 */
export function flattenDnsRecordSets(
  recordSets: IDnsRecordSetControlResponse[]
): IFlattenedDnsRecord[] {
  const flattened: IFlattenedDnsRecord[] = [];

  recordSets.forEach((recordSet) => {
    const records = recordSet.records || [];
    const status = extractStatus(recordSet.status);

    records.forEach((record: any) => {
      const values = extractValues(record, recordSet.recordType);
      const ttl = extractTTL(record);

      // Create one row per value
      values.forEach((value) => {
        flattened.push({
          recordSetId: recordSet.uid || '',
          recordSetName: recordSet.name || '',
          createdAt: recordSet.createdAt || new Date(),
          dnsZoneId: recordSet.dnsZoneId || '',
          type: recordSet.recordType || '',
          name: record.name || '',
          value: value,
          ttl: ttl,
          status: status,
          rawData: record,
        });
      });
    });
  });

  // Sort by type priority, then by name
  return flattened.sort((a, b) => {
    const priorityDiff = getDnsRecordTypePriority(a.type) - getDnsRecordTypePriority(b.type);
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Extract values from different record types based on K8s schema
 * Returns array of strings, each will become a separate row
 * Reference: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['records']
 */
function extractValues(record: any, recordType: string | undefined): string[] {
  switch (recordType) {
    case 'A':
      // record.a.content: Array<string>
      return record.a?.content || [];

    case 'AAAA':
      // record.aaaa.content: Array<string>
      return record.aaaa?.content || [];

    case 'CNAME':
      // record.cname.content: string (single value, not array)
      return record.cname?.content ? [record.cname.content] : [];

    case 'TXT':
      // record.txt.content: Array<string>
      return record.txt?.content || [];

    case 'NS':
    case 'PTR':
      // record.raw: Array<string>
      return record.raw || [];

    case 'SOA':
      // record.soa: { mname, rname, refresh, retry, expire, serial, ttl }
      // Return as JSON string to preserve object structure for editing
      // Format will be applied in table cell renderer
      if (record.soa) {
        return [JSON.stringify(record.soa)];
      }
      return [];

    case 'MX':
      // record.mx: Array<{ exchange: string, preference: number }>
      // Format: "preference|exchange" (pipe separator for UI parsing)
      if (record.mx) {
        return record.mx.map((mx: any) => `${mx.preference}|${mx.exchange}`);
      }
      return [];

    case 'SRV':
      // record.srv: Array<{ priority, weight, port, target }>
      // Format: "priority weight port target"
      if (record.srv) {
        return record.srv.map(
          (srv: any) => `${srv.priority} ${srv.weight} ${srv.port} ${srv.target}`
        );
      }
      return [];

    case 'CAA':
      // record.caa: Array<{ flag, tag, value }>
      // Format: "flag tag value"
      if (record.caa) {
        return record.caa.map((caa: any) => `${caa.flag} ${caa.tag} "${caa.value}"`);
      }
      return [];

    case 'TLSA':
      // record.tlsa: Array<{ usage, selector, matchingType, certData }>
      // Format: "usage selector matchingType certData"
      if (record.tlsa) {
        return record.tlsa.map(
          (tlsa: any) => `${tlsa.usage} ${tlsa.selector} ${tlsa.matchingType} ${tlsa.certData}`
        );
      }
      return [];

    case 'HTTPS':
      // record.https: Array<{ priority, target, params }>
      // Format: "priority target [params]"
      if (record.https) {
        return record.https.map((https: any) => {
          const params = https.params
            ? ` ${Object.entries(https.params)
                .map(([k, v]) => `${k}=${v}`)
                .join(' ')}`
            : '';
          return `${https.priority} ${https.target}${params}`;
        });
      }
      return [];

    case 'SVCB':
      // record.svcb: Array<{ priority, target, params }>
      // Format: "priority target [params]"
      if (record.svcb) {
        return record.svcb.map((svcb: any) => {
          const params = svcb.params
            ? ` ${Object.entries(svcb.params)
                .map(([k, v]) => `${k}=${v}`)
                .join(' ')}`
            : '';
          return `${svcb.priority} ${svcb.target}${params}`;
        });
      }
      return [];

    default:
      // Fallback to raw if available
      return record.raw || [];
  }
}

/**
 * Extract TTL from record
 */
function extractTTL(record: any): number | undefined {
  // SOA has TTL in soa.ttl
  if (record.soa?.ttl) return record.soa.ttl;

  // Other types might have TTL at record level
  if (record.ttl) return record.ttl;

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
