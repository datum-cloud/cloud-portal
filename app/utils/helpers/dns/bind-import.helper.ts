/**
 * BIND Zone File Import Helper
 * Transform functions for converting parsed BIND records to application formats
 */
// Import ParsedDnsRecord type for local use
import type { ParsedDnsRecord } from '@/modules/bind-parser';
import {
  IDnsZoneDiscoveryRecordSet,
  IFlattenedDnsRecord,
} from '@/resources/interfaces/dns.interface';
import { DNSRecordType } from '@/resources/schemas/dns-record.schema';

// Re-export parser from bind-parser module
export {
  parseBindZoneFile,
  type BindParseResult,
  type ParsedDnsRecord,
} from '@/modules/bind-parser';

/**
 * Build rawData in K8s format from parsed record data
 */
function buildRawDataFromParsed(record: ParsedDnsRecord): Record<string, unknown> {
  const base = { name: record.name, ttl: record.ttl };

  switch (record.type) {
    case 'A':
      return { ...base, a: { content: record.data.content } };
    case 'AAAA':
      return { ...base, aaaa: { content: record.data.content } };
    case 'CNAME':
      return { ...base, cname: { content: record.data.content } };
    case 'TXT':
      return { ...base, txt: { content: record.data.content } };
    case 'NS':
      return { ...base, ns: { content: record.data.content } };
    case 'PTR':
      return { ...base, ptr: { content: record.data.content } };
    case 'MX':
      return {
        ...base,
        mx: { preference: record.data.preference, exchange: record.data.exchange },
      };
    case 'SRV':
      return {
        ...base,
        srv: {
          priority: record.data.priority,
          weight: record.data.weight,
          port: record.data.port,
          target: record.data.target,
        },
      };
    case 'CAA':
      return {
        ...base,
        caa: { flag: record.data.flag, tag: record.data.tag, value: record.data.value },
      };
    case 'SOA':
      return { ...base, soa: record.data };
    case 'TLSA':
      return {
        ...base,
        tlsa: {
          usage: record.data.usage,
          selector: record.data.selector,
          matchingType: record.data.matchingType,
          certData: record.data.certData,
        },
      };
    case 'HTTPS':
      return {
        ...base,
        https: {
          priority: record.data.priority,
          target: record.data.target,
          params: record.data.params,
        },
      };
    case 'SVCB':
      return {
        ...base,
        svcb: {
          priority: record.data.priority,
          target: record.data.target,
          params: record.data.params,
        },
      };
    default:
      return base;
  }
}

/**
 * Transform parsed BIND records to IFlattenedDnsRecord[] for UI display
 */
export function transformParsedToFlattened(
  records: ParsedDnsRecord[],
  dnsZoneId: string
): IFlattenedDnsRecord[] {
  return records.map((record) => ({
    dnsZoneId,
    type: record.type,
    name: record.name,
    value: record.value,
    ttl: record.ttl ?? undefined,
    rawData: buildRawDataFromParsed(record),
  }));
}

/**
 * Transform parsed BIND records to recordSets format for bulk import API
 * Groups records by recordType matching the API schema
 */
export function transformParsedToRecordSets(
  records: ParsedDnsRecord[]
): IDnsZoneDiscoveryRecordSet[] {
  // Group records by type
  const grouped = records.reduce(
    (acc, record) => {
      if (!acc[record.type]) {
        acc[record.type] = [];
      }

      // Build the record entry with type-specific field
      // Ensure TTL is an integer
      const ttlValue = record.ttl !== null ? Number(record.ttl) : null;
      const entry: Record<string, unknown> = {
        name: record.name,
        ...(ttlValue !== null && !isNaN(ttlValue) && { ttl: ttlValue }),
        [record.type.toLowerCase()]: record.data,
      };

      acc[record.type].push(entry);
      return acc;
    },
    {} as Record<string, Record<string, unknown>[]>
  );

  // Convert to array format matching IDnsZoneDiscoveryRecordSet
  return Object.entries(grouped).map(([recordType, records]) => ({
    recordType: recordType as DNSRecordType,
    records,
  })) as IDnsZoneDiscoveryRecordSet[];
}
