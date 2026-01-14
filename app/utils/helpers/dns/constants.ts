// =============================================================================
// Supported DNS Record Types
// =============================================================================

/**
 * List of all supported DNS record types (ordered by display priority)
 * SOA and NS come first, then common types, then specialized types
 */
export const SUPPORTED_DNS_RECORD_TYPES = [
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

export type SupportedDnsRecordType = (typeof SUPPORTED_DNS_RECORD_TYPES)[number];

/**
 * Set for O(1) lookup of supported types
 * Use this when checking if a type is supported
 */
export const SUPPORTED_DNS_RECORD_TYPES_SET = new Set<string>(SUPPORTED_DNS_RECORD_TYPES);
