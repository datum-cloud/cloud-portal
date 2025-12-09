/**
 * DNS Record Comparison Utilities
 * Centralized duplicate detection and record matching logic
 */
import { extractValue } from './flatten.helper';

// =============================================================================
// Types
// =============================================================================

/**
 * Type-specific record comparator function
 * Returns true if records are considered duplicates
 */
type RecordComparator = (newRecord: any, existingRecord: any) => boolean;

// =============================================================================
// Name Normalization
// =============================================================================

/**
 * Normalize record name for comparison
 * - Empty string or '@' → '@' (apex)
 * - Remove trailing dot from FQDNs
 */
export function normalizeRecordName(name: string | undefined | null): string {
  if (!name || name === '@') return '@';
  return name.replace(/\.$/, '');
}

// =============================================================================
// Type-Specific Comparators
// =============================================================================

/**
 * Compare SOA records (excludes serial - it changes on every zone update)
 */
function compareSoaRecords(newRecord: any, existingRecord: any): boolean {
  const newSoa = newRecord.soa;
  const existingSoa = existingRecord.soa;

  if (!newSoa || !existingSoa) return false;

  return (
    newSoa.mname === existingSoa.mname &&
    newSoa.rname === existingSoa.rname &&
    Number(newSoa.refresh) === Number(existingSoa.refresh) &&
    Number(newSoa.retry) === Number(existingSoa.retry) &&
    Number(newSoa.expire) === Number(existingSoa.expire) &&
    Number(newSoa.ttl) === Number(existingSoa.ttl)
  );
}

/**
 * Default comparator: value + TTL comparison
 */
function compareByValueAndTTL(newRecord: any, existingRecord: any, recordType: string): boolean {
  const existingValue = extractValue(existingRecord, recordType);
  const newValue = extractValue(newRecord, recordType);
  if (existingValue !== newValue) return false;

  const existingTTL = existingRecord.ttl ?? null;
  const newTTL = newRecord.ttl ?? null;
  return existingTTL === newTTL;
}

/**
 * Registry of type-specific comparators
 * Add entries here for types that need special handling
 */
const RECORD_COMPARATORS: Record<string, RecordComparator> = {
  SOA: compareSoaRecords,
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if a record is a duplicate of any existing record
 *
 * @param newRecord - The new record to check
 * @param existingRecords - Array of existing records to compare against
 * @param recordType - The DNS record type (e.g., 'A', 'SOA', 'MX')
 * @returns true if duplicate found, false otherwise
 */
export function isDuplicateRecord(
  newRecord: any,
  existingRecords: any[],
  recordType: string
): boolean {
  const comparator = RECORD_COMPARATORS[recordType];

  return existingRecords.some((existingRecord) => {
    // Name must always match (normalized)
    const existingName = normalizeRecordName(existingRecord.name);
    const newName = normalizeRecordName(newRecord.name);
    if (existingName !== newName) return false;

    // Use type-specific comparator if available
    if (comparator) {
      return comparator(newRecord, existingRecord);
    }

    return compareByValueAndTTL(newRecord, existingRecord, recordType);
  });
}

/**
 * Find index of a matching record in existing records
 * Used for update/delete operations
 *
 * @param existingRecords - Array of existing records to search
 * @param recordType - The DNS record type
 * @param criteria - Matching criteria (name required, value/ttl optional)
 * @returns Index of matching record, or -1 if not found
 */
export function findRecordIndex(
  existingRecords: any[],
  recordType: string,
  criteria: {
    name: string;
    value?: string;
    ttl?: number | null;
  }
): number {
  return existingRecords.findIndex((r) => {
    // Name must match (normalized)
    if (normalizeRecordName(r.name) !== normalizeRecordName(criteria.name)) {
      return false;
    }

    // Value comparison if provided
    if (criteria.value !== undefined) {
      const recordValue = extractValue(r, recordType);
      if (recordValue !== criteria.value) return false;
    }

    // TTL comparison if provided
    if (criteria.ttl !== undefined) {
      const recordTTL = r.ttl ?? null;
      if (recordTTL !== criteria.ttl) return false;
    }

    return true;
  });
}
