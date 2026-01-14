/**
 * BIND Zone File Parser
 * RFC 1035 compliant parser for DNS zone files
 *
 * Supports:
 * - Standard BIND format
 * - Cloudflare zone export format
 * - Google Cloud DNS export format
 * - AWS Route53 export format
 *
 * Record types: A, AAAA, ALIAS, CNAME, MX, TXT, NS, PTR, SRV, CAA, SOA, TLSA, HTTPS, SVCB
 *
 * Note: This module is self-contained with no external dependencies
 * to allow plug-and-play usage in different contexts.
 */
import { preprocessZoneFile } from './preprocessor';
import { parseRdata } from './rdata-parsers';
import { tokenizeRecordLine } from './tokenizer';
import type { BindParseResult, DNSRecordType, ParsedDnsRecord } from './types';

// Supported record types for import (self-contained, no external deps)
const SUPPORTED_TYPES = new Set<string>([
  'A',
  'AAAA',
  'ALIAS',
  'CNAME',
  'MX',
  'TXT',
  'NS',
  'PTR',
  'SRV',
  'CAA',
  'SOA',
  'TLSA',
  'HTTPS',
  'SVCB',
]);

// Types that generate warnings but are not imported
const WARNING_TYPES = new Set<string>(['SPF', 'DS', 'DNSKEY', 'RRSIG', 'NSEC', 'NSEC3', 'DNAME']);

/**
 * Normalize a record name
 * - Keep @ as-is (zone apex representation)
 * - Treat empty string as @ (apex)
 * - Remove trailing dot from other names
 */
function normalizeName(name: string | undefined | null): string {
  if (!name || name === '@') return '@';
  return name.replace(/\.$/, '');
}

/**
 * Build the display value for a record
 */
function buildRecordValue(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'A':
    case 'AAAA':
    case 'ALIAS':
    case 'CNAME':
    case 'NS':
    case 'PTR':
    case 'TXT':
      return String(data.content || '');

    case 'MX':
      return `${data.preference}|${data.exchange}`;

    case 'SRV':
      return `${data.priority} ${data.weight} ${data.port} ${data.target}`;

    case 'CAA':
      return `${data.flag} ${data.tag} ${data.value}`;

    case 'SOA':
      return JSON.stringify({
        mname: data.mname,
        rname: data.rname,
        serial: data.serial,
        refresh: data.refresh,
        retry: data.retry,
        expire: data.expire,
        ttl: data.ttl,
      });

    case 'TLSA':
      return `${data.usage} ${data.selector} ${data.matchingType} ${data.certData}`;

    case 'HTTPS':
    case 'SVCB': {
      const params = data.params as Record<string, string> | undefined;
      const paramsStr = params
        ? Object.entries(params)
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ')
        : '';
      return paramsStr
        ? `${data.priority} ${data.target || '.'} ${paramsStr}`
        : `${data.priority} ${data.target || '.'}`;
    }

    default:
      return String(data.content || '');
  }
}

/**
 * Parse a BIND zone file content into structured DNS records
 *
 * @param content - Raw zone file content
 * @returns Parse result with records, errors, and warnings
 */
export function parseBindZoneFile(content: string): BindParseResult {
  const records: ParsedDnsRecord[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const warningTypesFound = new Set<string>();

  try {
    // Preprocess: remove comments, collapse multiline, extract directives
    const { lines, origin, defaultTTL } = preprocessZoneFile(content);

    if (lines.length === 0) {
      errors.push('No valid DNS records found in the file');
      return { records, errors, warnings };
    }

    let previousName = origin || '@';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Tokenize the line
      const tokenized = tokenizeRecordLine(line, previousName);

      if (!tokenized) {
        // Could not parse line - skip silently (might be directive or malformed)
        continue;
      }

      const { name, ttl, type, rdata } = tokenized;

      // Update previous name for inheritance
      if (name) {
        previousName = name;
      }

      // Check for unsupported types that should generate warnings
      if (WARNING_TYPES.has(type)) {
        warningTypesFound.add(type);
        continue;
      }

      // Skip unsupported types silently
      if (!SUPPORTED_TYPES.has(type)) {
        continue;
      }

      // Parse the rdata based on type
      const data = parseRdata(type, rdata);

      // Build the display value
      const value = buildRecordValue(type, data);

      // Normalize the name
      const normalizedName = normalizeName(name || previousName);

      // Apply default TTL if not specified
      const finalTTL = ttl ?? defaultTTL;

      records.push({
        name: normalizedName,
        ttl: finalTTL,
        type: type as DNSRecordType,
        value,
        data,
      });
    }

    // Add warnings for unsupported types found
    for (const type of warningTypesFound) {
      if (type === 'SPF') {
        warnings.push(`Found SPF record(s) - SPF records should be TXT records`);
      } else {
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

// Re-export types for convenience
export type { BindParseResult, DNSRecordType, ParsedDnsRecord };
