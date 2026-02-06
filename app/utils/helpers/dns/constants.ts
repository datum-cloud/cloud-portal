// =============================================================================
// DNS Record Types - Single Source of Truth
// =============================================================================

/**
 * All DNS record types including SOA (ordered by display priority)
 * SOA and NS come first, then common types, then specialized types
 * Used for validation and parsing where all types need to be recognized
 */
export const DNS_RECORD_TYPES = [
  'SOA',
  'NS',
  'A',
  'AAAA',
  'CNAME',
  'ALIAS',
  'MX',
  'TXT',
  'SRV',
  'CAA',
  'PTR',
  'TLSA',
  'HTTPS',
  'SVCB',
] as const;

export type DNSRecordType = (typeof DNS_RECORD_TYPES)[number];

/**
 * DNS record types that users can create/import (excludes SOA)
 * SOA is auto-created by DNSZone and should not be user-managed
 * @see https://github.com/datum-cloud/cloud-portal/issues/901
 */
export const SUPPORTED_DNS_RECORD_TYPES = DNS_RECORD_TYPES.filter(
  (type): type is Exclude<DNSRecordType, 'SOA'> => type !== 'SOA'
);

export type SupportedDnsRecordType = (typeof SUPPORTED_DNS_RECORD_TYPES)[number];

/**
 * Set for O(1) lookup of supported types (excludes SOA)
 * Use this when checking if a type is user-manageable
 */
export const SUPPORTED_DNS_RECORD_TYPES_SET = new Set<string>(SUPPORTED_DNS_RECORD_TYPES);

/**
 * Set for O(1) lookup of all DNS types (includes SOA)
 * Use this when checking if a type is a valid DNS record type
 */
export const DNS_RECORD_TYPES_SET = new Set<string>(DNS_RECORD_TYPES);
