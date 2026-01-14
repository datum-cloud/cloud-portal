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
// Domain Name Normalization (RFC 1035)
// =============================================================================

/**
 * Normalize a domain name for comparison
 * - Strips trailing dot (FQDN indicator)
 * - Handles empty/null values
 *
 * Per RFC 1035: "example.com." and "example.com" are semantically identical
 *
 * @param value - Domain name (may have trailing dot)
 * @returns Normalized domain name without trailing dot
 */
export function normalizeDomainName(value: string | undefined | null): string {
  if (!value) return '';
  return value.replace(/\.$/, '');
}

/**
 * Normalize record name for comparison
 * - Empty string or '@' → '@' (apex)
 * - Remove trailing dot from FQDNs
 */
export function normalizeRecordName(name: string | undefined | null): string {
  if (!name || name === '@') return '@';
  return normalizeDomainName(name);
}

// =============================================================================
// Type-Specific Comparators
// =============================================================================

/**
 * Compare SOA records
 * - Excludes serial (it changes on every zone update)
 * - Normalizes mname and rname domain names
 */
function compareSoaRecords(newRecord: any, existingRecord: any): boolean {
  const newSoa = newRecord.soa;
  const existingSoa = existingRecord.soa;

  if (!newSoa || !existingSoa) return false;

  return (
    normalizeDomainName(newSoa.mname) === normalizeDomainName(existingSoa.mname) &&
    normalizeDomainName(newSoa.rname) === normalizeDomainName(existingSoa.rname) &&
    Number(newSoa.refresh) === Number(existingSoa.refresh) &&
    Number(newSoa.retry) === Number(existingSoa.retry) &&
    Number(newSoa.expire) === Number(existingSoa.expire) &&
    Number(newSoa.ttl) === Number(existingSoa.ttl)
  );
}

/**
 * Compare MX records (normalize exchange domain)
 */
function compareMxRecords(newRecord: any, existingRecord: any): boolean {
  const newMx = newRecord.mx;
  const existingMx = existingRecord.mx;

  if (!newMx || !existingMx) return false;

  return (
    Number(newMx.preference) === Number(existingMx.preference) &&
    normalizeDomainName(newMx.exchange) === normalizeDomainName(existingMx.exchange)
  );
}

/**
 * Compare CNAME records (normalize target domain)
 */
function compareCnameRecords(newRecord: any, existingRecord: any): boolean {
  return (
    normalizeDomainName(newRecord.cname?.content) ===
    normalizeDomainName(existingRecord.cname?.content)
  );
}

/**
 * Compare ALIAS records (normalize target domain)
 */
function compareAliasRecords(newRecord: any, existingRecord: any): boolean {
  return (
    normalizeDomainName(newRecord.alias?.content) ===
    normalizeDomainName(existingRecord.alias?.content)
  );
}

/**
 * Compare NS records (normalize nameserver domain)
 */
function compareNsRecords(newRecord: any, existingRecord: any): boolean {
  return (
    normalizeDomainName(newRecord.ns?.content) === normalizeDomainName(existingRecord.ns?.content)
  );
}

/**
 * Compare PTR records (normalize target domain)
 */
function comparePtrRecords(newRecord: any, existingRecord: any): boolean {
  return (
    normalizeDomainName(newRecord.ptr?.content) === normalizeDomainName(existingRecord.ptr?.content)
  );
}

/**
 * Compare SRV records (normalize target domain)
 */
function compareSrvRecords(newRecord: any, existingRecord: any): boolean {
  const newSrv = newRecord.srv;
  const existingSrv = existingRecord.srv;

  if (!newSrv || !existingSrv) return false;

  return (
    Number(newSrv.priority) === Number(existingSrv.priority) &&
    Number(newSrv.weight) === Number(existingSrv.weight) &&
    Number(newSrv.port) === Number(existingSrv.port) &&
    normalizeDomainName(newSrv.target) === normalizeDomainName(existingSrv.target)
  );
}

/**
 * Compare HTTPS records (normalize target domain)
 */
function compareHttpsRecords(newRecord: any, existingRecord: any): boolean {
  const newHttps = newRecord.https;
  const existingHttps = existingRecord.https;

  if (!newHttps || !existingHttps) return false;

  return (
    Number(newHttps.priority) === Number(existingHttps.priority) &&
    normalizeDomainName(newHttps.target) === normalizeDomainName(existingHttps.target) &&
    JSON.stringify(newHttps.params || {}) === JSON.stringify(existingHttps.params || {})
  );
}

/**
 * Compare SVCB records (normalize target domain)
 */
function compareSvcbRecords(newRecord: any, existingRecord: any): boolean {
  const newSvcb = newRecord.svcb;
  const existingSvcb = existingRecord.svcb;

  if (!newSvcb || !existingSvcb) return false;

  return (
    Number(newSvcb.priority) === Number(existingSvcb.priority) &&
    normalizeDomainName(newSvcb.target) === normalizeDomainName(existingSvcb.target) &&
    JSON.stringify(newSvcb.params || {}) === JSON.stringify(existingSvcb.params || {})
  );
}

/**
 * Default comparator: value + TTL comparison
 * Used for types without domain name fields (A, AAAA, TXT, CAA, TLSA)
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
 * Types with domain name fields need special handling for trailing dot normalization
 */
const RECORD_COMPARATORS: Record<string, RecordComparator> = {
  SOA: compareSoaRecords,
  MX: compareMxRecords,
  CNAME: compareCnameRecords,
  ALIAS: compareAliasRecords,
  NS: compareNsRecords,
  PTR: comparePtrRecords,
  SRV: compareSrvRecords,
  HTTPS: compareHttpsRecords,
  SVCB: compareSvcbRecords,
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
 * Record types with domain name fields that need trailing dot normalization
 * Used for value comparison in findRecordIndex
 */
const DOMAIN_NAME_VALUE_TYPES = new Set(['CNAME', 'ALIAS', 'NS', 'PTR']);

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

      // Apply domain normalization for types with simple domain name values
      if (DOMAIN_NAME_VALUE_TYPES.has(recordType)) {
        if (normalizeDomainName(recordValue) !== normalizeDomainName(criteria.value)) {
          return false;
        }
      } else if (recordValue !== criteria.value) {
        return false;
      }
    }

    // TTL comparison if provided
    if (criteria.ttl !== undefined) {
      const recordTTL = r.ttl ?? null;
      if (recordTTL !== criteria.ttl) return false;
    }

    return true;
  });
}
