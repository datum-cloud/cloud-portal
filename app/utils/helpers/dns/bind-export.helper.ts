import { SUPPORTED_DNS_RECORD_TYPES } from './constants';
import { ensureFqdn } from './record-type.helper';
import { IFlattenedDnsRecord } from '@/resources/dns-records';

// =============================================================================
// BIND Zone File Export - Custom Implementation (RFC 1035 compliant)
// =============================================================================

/**
 * Escape and format TXT record values according to RFC 1035
 * - If value is already quoted, use as-is (just escape internal quotes)
 * - If value is not quoted, add quotes
 * - Values longer than 255 chars are split into multiple strings
 */
function escapeTxtValue(value: string): string {
  // Check if value is already quoted
  const isAlreadyQuoted = value.startsWith('"') && value.endsWith('"');

  // Remove existing quotes if present to normalize
  const unquoted = isAlreadyQuoted ? value.slice(1, -1) : value;

  // Escape backslashes and internal quotes
  const escaped = unquoted.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // If value is longer than 255 chars, split into multiple quoted strings
  if (escaped.length > 255) {
    const chunks: string[] = [];
    for (let i = 0; i < escaped.length; i += 255) {
      chunks.push(`"${escaped.slice(i, i + 255)}"`);
    }
    return chunks.join(' ');
  }

  return `"${escaped}"`;
}

/**
 * Format a single DNS record line in BIND format
 * Standard format: <name> [TTL] IN <type> <rdata>
 */
function formatRecordLine(
  name: string,
  ttl: number | undefined,
  type: string,
  rdata: string
): string {
  const parts = [name || '@'];

  if (ttl !== undefined) {
    parts.push(String(ttl));
  }

  parts.push('IN', type, rdata);

  return parts.join('\t');
}

/**
 * Generate BIND zone file content from flattened DNS records
 * This is a custom implementation that supports all our record types
 * and doesn't require SOA records
 *
 * @param records - Array of flattened DNS records
 * @param origin - Optional zone origin (e.g., "example.com")
 * @param defaultTTL - Optional default TTL in seconds
 * @returns RFC 1035 compliant BIND zone file content
 */
export function generateBindZoneFile(
  records: IFlattenedDnsRecord[],
  origin?: string,
  defaultTTL?: number
): string {
  const lines: string[] = [];

  // Add zone directives
  if (origin) {
    const fqdnOrigin = ensureFqdn(origin);
    lines.push(`$ORIGIN ${fqdnOrigin}`);
  }

  if (defaultTTL !== undefined) {
    lines.push(`$TTL ${defaultTTL}`);
  }

  if (lines.length > 0) {
    lines.push(''); // Empty line after directives
  }

  // Group records by type for organized output
  const recordsByType = new Map<string, IFlattenedDnsRecord[]>();

  for (const record of records) {
    const existing = recordsByType.get(record.type) || [];
    existing.push(record);
    recordsByType.set(record.type, existing);
  }

  // Generate records in type order
  for (const type of SUPPORTED_DNS_RECORD_TYPES) {
    const typeRecords = recordsByType.get(type);
    if (!typeRecords || typeRecords.length === 0) continue;

    // Add comment for record type section
    lines.push(`; ${type} Records`);

    for (const record of typeRecords) {
      const line = formatRecord(record);
      if (line) {
        lines.push(line);
      }
    }

    lines.push(''); // Empty line between sections
  }

  // Handle any remaining types not in our order list
  for (const [type, typeRecords] of recordsByType) {
    if (SUPPORTED_DNS_RECORD_TYPES.includes(type as any)) continue;

    lines.push(`; ${type} Records`);
    for (const record of typeRecords) {
      const line = formatRecord(record);
      if (line) {
        lines.push(line);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

/**
 * Format a single record based on its type
 */
function formatRecord(record: IFlattenedDnsRecord): string | null {
  const { name, ttl, type, value } = record;

  switch (type) {
    case 'A':
    case 'AAAA':
      // Simple address records: <name> [TTL] IN A/AAAA <ip>
      return formatRecordLine(name, ttl, type, value);

    case 'CNAME':
    case 'ALIAS':
    case 'NS':
    case 'PTR':
      // Records with domain name targets
      return formatRecordLine(name, ttl, type, ensureFqdn(value));

    case 'TXT':
      // TXT records need proper quoting and escaping
      return formatRecordLine(name, ttl, 'TXT', escapeTxtValue(value));

    case 'MX': {
      // value format: "preference|exchange"
      const [preference, exchange] = value.split('|');
      const rdata = `${preference || '10'} ${ensureFqdn(exchange || '')}`;
      return formatRecordLine(name, ttl, 'MX', rdata);
    }

    case 'SRV': {
      // value format: "priority weight port target"
      const [priority, weight, port, target] = value.split(' ');
      const rdata = `${priority} ${weight} ${port} ${ensureFqdn(target || '')}`;
      return formatRecordLine(name, ttl, 'SRV', rdata);
    }

    case 'CAA': {
      // value format (internal): 'flag tag value' (no quotes)
      // Output format: <name> [TTL] IN CAA <flag> <tag> "<value>"
      const caaMatch = value.match(/^(\d+)\s+(\w+)\s+(.+)$/);
      if (caaMatch) {
        // Strip any existing quotes from value and re-add them
        const caaValue = caaMatch[3].replace(/^"|"$/g, '');
        const rdata = `${caaMatch[1]} ${caaMatch[2]} "${caaValue}"`;
        return formatRecordLine(name, ttl, 'CAA', rdata);
      }
      return null;
    }

    case 'SOA': {
      // value is JSON string
      // Output format: <name> [TTL] IN SOA <mname> <rname> ( serial refresh retry expire minimum )
      try {
        const soa = JSON.parse(value);
        const rdata = [
          ensureFqdn(soa.mname || ''),
          ensureFqdn(soa.rname || ''),
          '(',
          `\t${soa.serial || 1}`,
          `\t${soa.refresh || 3600}`,
          `\t${soa.retry || 600}`,
          `\t${soa.expire || 86400}`,
          `\t${soa.ttl || soa.minimum || 3600} )`,
        ].join('\n');
        return formatRecordLine(name, ttl, 'SOA', rdata);
      } catch {
        return null;
      }
    }

    case 'TLSA': {
      // value format: "usage selector matchingType certData"
      // Output format: <name> [TTL] IN TLSA <usage> <selector> <matchingType> <certData>
      return formatRecordLine(name, ttl, 'TLSA', value);
    }

    case 'HTTPS':
    case 'SVCB': {
      // value format: "priority target [params]"
      // Output format: <name> [TTL] IN HTTPS/SVCB <priority> <target> [params]
      // Parse priority and target, rest is params
      const match = value.match(/^(\d+)\s+(\S+)(.*)$/);
      if (match) {
        const [, priority, target, params] = match;
        const rdata = `${priority} ${ensureFqdn(target)}${params || ''}`;
        return formatRecordLine(name, ttl, type, rdata);
      }
      return formatRecordLine(name, ttl, type, value);
    }

    default:
      // Unknown type - output as-is
      return formatRecordLine(name, ttl, type, value);
  }
}

/**
 * Transform flattened DNS records to BIND zone file format string
 * @param records - Array of flattened DNS records
 * @param origin - Optional zone origin (e.g., "example.com")
 * @param defaultTTL - Optional default TTL
 * @returns BIND zone file content as string
 */
export function transformRecordsToBindFormat(
  records: IFlattenedDnsRecord[],
  origin?: string,
  defaultTTL?: number
): string {
  return generateBindZoneFile(records, origin, defaultTTL);
}
