/**
 * BIND Zone File Import Helper
 * Transform functions for converting parsed BIND records to application formats
 */
// Import ParsedDnsRecord type for local use
import { isDuplicateRecord } from './record-comparison.helper';
import { ensureFqdn, hasFqdnFields, transformFqdnFields } from './record-type.helper';
import type { ParsedDnsRecord } from '@/modules/bind-parser';
import { IFlattenedDnsRecord } from '@/resources/dns-records';
import { DNSRecordType, TTL_OPTIONS } from '@/resources/dns-records';
import { IDnsZoneDiscoveryRecordSet } from '@/resources/dns-zone-discoveries';

// Re-export parser from bind-parser module
export {
  parseBindZoneFile,
  type BindParseResult,
  type ParsedDnsRecord,
} from '@/modules/bind-parser';

// ============================================================================
// TTL Normalization
// ============================================================================

/**
 * Valid TTL values derived from TTL_OPTIONS
 * Excludes null (Auto) since we only care about numeric values
 */
const VALID_TTL_VALUES: number[] = TTL_OPTIONS.reduce<number[]>((acc, opt) => {
  if (opt.value !== null) {
    acc.push(opt.value);
  }
  return acc;
}, []);

const VALID_TTL_SET = new Set(VALID_TTL_VALUES);

/**
 * Minimum valid TTL from TTL_OPTIONS
 */
const MIN_VALID_TTL = Math.min(...VALID_TTL_VALUES);

/**
 * TTL Configuration for normalization
 * - DEFAULT_TTL: Default TTL used when normalization is needed (5 minutes)
 * - isValidTTL: Function to check if a TTL value is in our allowed list
 */
export const TTL_CONFIG = {
  DEFAULT_TTL: 300,
  MIN_TTL: MIN_VALID_TTL,
  isValidTTL: (ttl: number): boolean => VALID_TTL_SET.has(ttl),
} as const;

/**
 * Result of TTL normalization
 */
interface TTLNormalizationResult {
  value: number | null;
  adjusted: boolean;
  originalValue?: number;
}

/**
 * Normalize TTL value to ensure sensible DNS behavior
 *
 * Handles:
 * - Invalid TTLs not in TTL_OPTIONS (e.g., Cloudflare's 1-second = "Auto")
 * - TTLs below minimum threshold
 * - Null/undefined TTLs (passed through as-is for backend defaults)
 *
 * @param ttl - Original TTL value (null means use backend default)
 * @returns Normalized TTL with adjustment info
 */
export function normalizeTTL(ttl: number | null): TTLNormalizationResult {
  if (ttl === null) {
    return { value: null, adjusted: false };
  }

  // Check if TTL is in our valid options list
  // If not valid, always use DEFAULT_TTL (300 seconds)
  if (!TTL_CONFIG.isValidTTL(ttl)) {
    return {
      value: TTL_CONFIG.DEFAULT_TTL,
      adjusted: true,
      originalValue: ttl,
    };
  }

  return { value: ttl, adjusted: false };
}

/**
 * Deduplicate parsed DNS records within a batch
 * Uses isDuplicateRecord for consistent duplicate detection with trailing dot normalization
 *
 * @param records - Array of parsed DNS records (may contain duplicates)
 * @returns Object with unique records and duplicate count
 */
export function deduplicateParsedRecords(records: ParsedDnsRecord[]): {
  unique: ParsedDnsRecord[];
  duplicateCount: number;
} {
  const unique: ParsedDnsRecord[] = [];
  let duplicateCount = 0;

  // Group records by type for efficient duplicate checking
  const byType = new Map<string, any[]>();

  for (const record of records) {
    const rawData = buildRawDataFromParsed(record);
    const existingOfType = byType.get(record.type) || [];

    // Check if this record is a duplicate of any we've already seen
    if (isDuplicateRecord(rawData, existingOfType, record.type)) {
      duplicateCount++;
      continue;
    }

    // Not a duplicate - add to unique list and track for future comparisons
    unique.push(record);
    existingOfType.push(rawData);
    byType.set(record.type, existingOfType);
  }

  return { unique, duplicateCount };
}

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
 * Applies TTL normalization to ensure valid TTL values
 */
export function transformParsedToFlattened(
  records: ParsedDnsRecord[],
  dnsZoneId: string
): IFlattenedDnsRecord[] {
  return records.map((record) => {
    const { value: normalizedTTL } = normalizeTTL(record.ttl);
    return {
      dnsZoneId,
      type: record.type,
      name: record.name,
      value: record.value,
      ttl: normalizedTTL ?? undefined,
      rawData: buildRawDataFromParsed(record),
    };
  });
}

/**
 * Transform parsed BIND records to recordSets format for bulk import API
 * Groups records by recordType matching the API schema
 * Applies FQDN normalization to domain name fields
 * Applies TTL normalization to ensure valid TTL values
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

      // Normalize TTL to ensure valid value
      const ttlValue = record.ttl !== null ? Number(record.ttl) : null;
      const { value: normalizedTTL } = normalizeTTL(ttlValue);

      // Normalize FQDN fields for domain name types
      const normalizedData = hasFqdnFields(record.type)
        ? transformFqdnFields(record.type, record.data as Record<string, unknown>, ensureFqdn)
        : record.data;

      const entry: Record<string, unknown> = {
        name: record.name,
        ...(normalizedTTL !== null && !isNaN(normalizedTTL) && { ttl: normalizedTTL }),
        [record.type.toLowerCase()]: normalizedData,
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
