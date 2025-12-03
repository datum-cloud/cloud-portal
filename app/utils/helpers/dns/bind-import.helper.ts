import {
  IDnsZoneDiscoveryRecordSet,
  IFlattenedDnsRecord,
} from '@/resources/interfaces/dns.interface';
import { DNSRecordType } from '@/resources/schemas/dns-record.schema';
import zonefile from 'dns-zonefile';
import { normalizeTxtValue, normalizeCaaValue } from './record-type.helper';

// =============================================================================
// BIND Zone File Parsing - Hybrid Implementation
// Uses dns-zonefile for standard types + custom parsing for TLSA, HTTPS, SVCB
// =============================================================================

export interface ParsedDnsRecord {
  name: string;
  ttl: number | null;
  type: DNSRecordType;
  value: string;
  data: Record<string, unknown>;
}

export interface BindParseResult {
  records: ParsedDnsRecord[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse TLSA records from raw zone file content
 * Format: <name> [TTL] [CLASS] TLSA <usage> <selector> <matching-type> <cert-data>
 */
function parseTlsaRecords(
  content: string,
  defaultTTL: number | null
): ParsedDnsRecord[] {
  const records: ParsedDnsRecord[] = [];
  // Match TLSA records - handles optional TTL and CLASS
  // Example: _443._tcp.example.com. 3600 IN TLSA 3 1 1 abc123...
  const tlsaRegex =
    /^(\S+)\s+(?:(\d+)\s+)?(?:IN\s+)?TLSA\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)/gim;

  let match;
  while ((match = tlsaRegex.exec(content)) !== null) {
    const [, name, ttlStr, usage, selector, matchingType, certData] = match;
    const ttl = ttlStr ? parseInt(ttlStr, 10) : defaultTTL;

    records.push({
      name: name.replace(/\.$/, ''), // Remove trailing dot
      ttl,
      type: 'TLSA',
      value: `${usage} ${selector} ${matchingType} ${certData}`,
      data: {
        usage: parseInt(usage, 10),
        selector: parseInt(selector, 10),
        matchingType: parseInt(matchingType, 10),
        certData,
      },
    });
  }

  return records;
}

/**
 * Parse HTTPS records from raw zone file content
 * Format: <name> [TTL] [CLASS] HTTPS <priority> <target> [params...]
 */
function parseHttpsRecords(
  content: string,
  defaultTTL: number | null
): ParsedDnsRecord[] {
  const records: ParsedDnsRecord[] = [];
  // Match HTTPS records
  // Example: example.com. 3600 IN HTTPS 1 . alpn="h3,h2" ipv4hint="192.0.2.1"
  const httpsRegex =
    /^(\S+)\s+(?:(\d+)\s+)?(?:IN\s+)?HTTPS\s+(\d+)\s+(\S+)(?:\s+(.+))?$/gim;

  let match;
  while ((match = httpsRegex.exec(content)) !== null) {
    const [, name, ttlStr, priority, target, paramsStr] = match;
    const ttl = ttlStr ? parseInt(ttlStr, 10) : defaultTTL;
    const params = parseSvcParams(paramsStr || '');

    const value = paramsStr
      ? `${priority} ${target} ${paramsStr}`
      : `${priority} ${target}`;

    records.push({
      name: name.replace(/\.$/, ''),
      ttl,
      type: 'HTTPS',
      value,
      data: {
        priority: parseInt(priority, 10),
        target: target === '.' ? '' : target.replace(/\.$/, ''),
        params,
      },
    });
  }

  return records;
}

/**
 * Parse SVCB records from raw zone file content
 * Format: <name> [TTL] [CLASS] SVCB <priority> <target> [params...]
 */
function parseSvcbRecords(
  content: string,
  defaultTTL: number | null
): ParsedDnsRecord[] {
  const records: ParsedDnsRecord[] = [];
  // Match SVCB records
  // Example: _dns.example.com. 3600 IN SVCB 1 dns.example.com. alpn="dot"
  const svcbRegex =
    /^(\S+)\s+(?:(\d+)\s+)?(?:IN\s+)?SVCB\s+(\d+)\s+(\S+)(?:\s+(.+))?$/gim;

  let match;
  while ((match = svcbRegex.exec(content)) !== null) {
    const [, name, ttlStr, priority, target, paramsStr] = match;
    const ttl = ttlStr ? parseInt(ttlStr, 10) : defaultTTL;
    const params = parseSvcParams(paramsStr || '');

    const value = paramsStr
      ? `${priority} ${target} ${paramsStr}`
      : `${priority} ${target}`;

    records.push({
      name: name.replace(/\.$/, ''),
      ttl,
      type: 'SVCB',
      value,
      data: {
        priority: parseInt(priority, 10),
        target: target === '.' ? '' : target.replace(/\.$/, ''),
        params,
      },
    });
  }

  return records;
}

/**
 * Parse SVCB/HTTPS params string into key-value object
 * Example: 'alpn="h3,h2" ipv4hint="127.0.0.1"' -> { alpn: "h3,h2", ipv4hint: "127.0.0.1" }
 */
function parseSvcParams(input: string): Record<string, string> {
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
 * Extract $TTL directive from zone file content
 */
function extractDefaultTTL(content: string): number | null {
  const ttlMatch = content.match(/^\$TTL\s+(\d+)/im);
  return ttlMatch ? parseInt(ttlMatch[1], 10) : null;
}

/**
 * Parse BIND zone file content to JSON format
 * Uses dns-zonefile for standard types + custom parsing for TLSA, HTTPS, SVCB
 */
export function parseBindZoneFile(content: string): BindParseResult {
  const records: ParsedDnsRecord[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // First, use dns-zonefile for standard record types
    const parsed = zonefile.parse(content);
    const defaultTTL = parsed.$ttl ?? extractDefaultTTL(content);
    const origin = parsed.$origin ?? '';

    // Helper to expand @ to the zone origin
    const expandAtSymbol = (value: string): string => {
      if (value === '@' && origin) {
        return origin;
      }
      return value;
    };

    // A records
    if (parsed.a) {
      for (const record of parsed.a) {
        records.push({
          name: record.name,
          ttl: record.ttl ?? defaultTTL,
          type: 'A',
          value: record.ip,
          data: { content: record.ip },
        });
      }
    }

    // AAAA records
    if (parsed.aaaa) {
      for (const record of parsed.aaaa) {
        records.push({
          name: record.name,
          ttl: record.ttl ?? defaultTTL,
          type: 'AAAA',
          value: record.ip,
          data: { content: record.ip },
        });
      }
    }

    // CNAME records
    if (parsed.cname) {
      for (const record of parsed.cname) {
        const alias = expandAtSymbol(record.alias);
        records.push({
          name: record.name,
          ttl: record.ttl ?? defaultTTL,
          type: 'CNAME',
          value: alias,
          data: { content: alias },
        });
      }
    }

    // MX records
    if (parsed.mx) {
      for (const record of parsed.mx) {
        const exchange = expandAtSymbol(record.host);
        records.push({
          name: record.name,
          ttl: record.ttl ?? defaultTTL,
          type: 'MX',
          value: `${record.preference}|${exchange}`,
          data: { preference: record.preference, exchange },
        });
      }
    }

    // TXT records - normalize to strip outer quotes for consistent internal storage
    if (parsed.txt) {
      for (const record of parsed.txt) {
        const normalizedValue = normalizeTxtValue(record.txt);
        records.push({
          name: record.name,
          ttl: record.ttl ?? defaultTTL,
          type: 'TXT',
          value: normalizedValue,
          data: { content: normalizedValue },
        });
      }
    }

    // NS records
    if (parsed.ns) {
      for (const record of parsed.ns) {
        const host = expandAtSymbol(record.host);
        records.push({
          name: record.name,
          ttl: record.ttl ?? defaultTTL,
          type: 'NS',
          value: host,
          data: { content: host },
        });
      }
    }

    // PTR records
    if (parsed.ptr) {
      for (const record of parsed.ptr) {
        const host = expandAtSymbol(record.host);
        records.push({
          name: record.name,
          ttl: record.ttl ?? defaultTTL,
          type: 'PTR',
          value: host,
          data: { content: host },
        });
      }
    }

    // SRV records
    if (parsed.srv) {
      for (const record of parsed.srv) {
        const target = expandAtSymbol(record.target);
        records.push({
          name: record.name,
          ttl: record.ttl ?? defaultTTL,
          type: 'SRV',
          value: `${record.priority} ${record.weight} ${record.port} ${target}`,
          data: {
            priority: record.priority,
            weight: record.weight,
            port: record.port,
            target,
          },
        });
      }
    }

    // CAA records - store without quotes for consistent internal storage
    if (parsed.caa) {
      for (const record of parsed.caa) {
        // dns-zonefile already strips quotes from value, so we just use it directly
        records.push({
          name: record.name,
          ttl: record.ttl ?? defaultTTL,
          type: 'CAA',
          value: `${record.flags} ${record.tag} ${record.value}`,
          data: { flag: record.flags, tag: record.tag, value: record.value },
        });
      }
    }

    // SOA record
    if (parsed.soa) {
      const soa = parsed.soa;
      records.push({
        name: soa.name,
        ttl: soa.ttl ?? defaultTTL,
        type: 'SOA',
        value: JSON.stringify({
          mname: soa.mname,
          rname: soa.rname,
          serial: soa.serial,
          refresh: soa.refresh,
          retry: soa.retry,
          expire: soa.expire,
          ttl: soa.minimum,
        }),
        data: {
          mname: soa.mname,
          rname: soa.rname,
          serial: soa.serial,
          refresh: soa.refresh,
          retry: soa.retry,
          expire: soa.expire,
          ttl: soa.minimum,
        },
      });
    }

    // Custom parsing for types not supported by dns-zonefile
    // TLSA records
    const tlsaRecords = parseTlsaRecords(content, defaultTTL);
    if (tlsaRecords.length > 0) {
      records.push(...tlsaRecords);
    }

    // HTTPS records
    const httpsRecords = parseHttpsRecords(content, defaultTTL);
    if (httpsRecords.length > 0) {
      records.push(...httpsRecords);
    }

    // SVCB records
    const svcbRecords = parseSvcbRecords(content, defaultTTL);
    if (svcbRecords.length > 0) {
      records.push(...svcbRecords);
    }

    // Check for unsupported record types and add warnings
    if (parsed.spf && parsed.spf.length > 0) {
      warnings.push(
        `Found ${parsed.spf.length} SPF record(s) - SPF records should be TXT records`
      );
    }

    if (parsed.ds && parsed.ds.length > 0) {
      warnings.push(
        `Found ${parsed.ds.length} DS record(s) - DS records are not supported`
      );
    }

    // Check for other unsupported types in raw content
    const unsupportedTypes = ['DNSKEY', 'RRSIG', 'NSEC', 'NSEC3', 'DNAME'];
    for (const type of unsupportedTypes) {
      const typeRegex = new RegExp(`\\s${type}\\s`, 'gi');
      if (typeRegex.test(content)) {
        warnings.push(`Found ${type} record(s) - ${type} records are not supported`);
      }
    }

    if (records.length === 0) {
      errors.push('No valid DNS records found in the file');
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Failed to parse zone file');
  }

  return { records, errors, warnings };
}

/**
 * Build rawData in K8s format from parsed record data
 */
function buildRawDataFromParsed(record: ParsedDnsRecord): any {
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
      // Ensure TTL is an integer (dns-zonefile may return it as string)
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

/**
 * Read file content as text
 */
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
