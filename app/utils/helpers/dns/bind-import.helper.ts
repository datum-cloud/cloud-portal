/**
 * BIND Zone File Import Helper
 * Transform functions for converting parsed BIND records to application formats
 */
// Import ParsedDnsRecord type for local use
import type { ParsedDnsRecord } from './bind-parser';
import { isDuplicateRecord } from './record-comparison.helper';
import { ensureFqdn, hasFqdnFields, transformFqdnFields } from './record-type.helper';
import { IFlattenedDnsRecord } from '@/resources/dns-records';
import { DNSRecordType, TTL_OPTIONS } from '@/resources/dns-records';
import { IDnsZoneDiscoveryRecordSet } from '@/resources/dns-zone-discoveries';

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
    case 'ALIAS':
      return { ...base, alias: { content: record.data.content } };
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

// ============================================================================
// Apex CNAME to ALIAS Transformation
// ============================================================================

/**
 * Result of apex CNAME to ALIAS transformation
 */
export interface ApexCnameTransformResult {
  /** Transformed records array */
  records: ParsedDnsRecord[];
  /** Number of records transformed */
  transformedCount: number;
  /** Indices of transformed records (for marking in flattened output) */
  transformedIndices: Set<number>;
}

/**
 * Transform apex (@) CNAME records to ALIAS records
 *
 * CNAME records cannot exist at zone apex per RFC 1034/1035, but ALIAS
 * provides equivalent functionality. This transformation allows importing
 * zone files that incorrectly have apex CNAMEs.
 *
 * Performance: Returns original array if no transformations needed (no allocation)
 *
 * @param records - Parsed DNS records
 * @returns Transformed records with transformation metadata
 */
export function transformApexCnameToAlias(records: ParsedDnsRecord[]): ApexCnameTransformResult {
  // Single pass to find apex CNAME indices
  const apexCnameIndices: number[] = [];
  for (let i = 0; i < records.length; i++) {
    if (records[i].type === 'CNAME' && records[i].name === '@') {
      apexCnameIndices.push(i);
    }
  }

  // No transformations needed - return original array
  if (apexCnameIndices.length === 0) {
    return {
      records,
      transformedCount: 0,
      transformedIndices: new Set(),
    };
  }

  // Create new array and transform only the apex CNAMEs
  const transformed = [...records];
  const transformedIndices = new Set<number>();

  for (const index of apexCnameIndices) {
    const original = records[index];
    transformed[index] = {
      ...original,
      type: 'ALIAS',
      // Data structure is identical for CNAME and ALIAS (both use { content: string })
    };
    transformedIndices.add(index);
  }

  return {
    records: transformed,
    transformedCount: apexCnameIndices.length,
    transformedIndices,
  };
}

// ============================================================================
// Transform to Flattened Records
// ============================================================================

/**
 * Transform parsed BIND records to IFlattenedDnsRecord[] for UI display
 * Applies TTL normalization to ensure valid TTL values
 *
 * @param records - Parsed DNS records
 * @param dnsZoneId - DNS zone ID
 * @param transformedIndices - Optional set of indices that were transformed (for _meta)
 */
export function transformParsedToFlattened(
  records: ParsedDnsRecord[],
  dnsZoneId: string,
  transformedIndices?: Set<number>
): IFlattenedDnsRecord[] {
  return records.map((record, index) => {
    const { value: normalizedTTL } = normalizeTTL(record.ttl);
    const flattened: IFlattenedDnsRecord = {
      dnsZoneId,
      type: record.type,
      name: record.name,
      value: record.value,
      ttl: normalizedTTL ?? undefined,
      rawData: buildRawDataFromParsed(record),
    };

    // Add transformation metadata if this record was transformed
    if (transformedIndices?.has(index)) {
      flattened._meta = { transformedFrom: 'CNAME' };
    }

    return flattened;
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

// ============================================================================
// Transform Flattened Records to RecordSets (for selected import)
// ============================================================================

/**
 * Transform selected flattened records back to recordSets format for import API.
 * Groups selected records by type, using rawData which already has the correct structure.
 *
 * This is used when importing only user-selected records from a BIND file import preview.
 *
 * @param selectedRecords - Array of selected IFlattenedDnsRecord from UI
 * @returns Array of IDnsZoneDiscoveryRecordSet grouped by type for API submission
 */
export function transformFlattenedToRecordSets(
  selectedRecords: IFlattenedDnsRecord[]
): IDnsZoneDiscoveryRecordSet[] {
  // Group by recordType
  const grouped = selectedRecords.reduce(
    (acc, record) => {
      if (!acc[record.type]) {
        acc[record.type] = [];
      }
      // Use rawData which already has the correct K8s API structure
      acc[record.type].push(record.rawData);
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
