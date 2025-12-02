// =============================================================================
// Supported DNS Record Types
// =============================================================================

/**
 * List of all supported DNS record types
 */
export const SUPPORTED_DNS_RECORD_TYPES = [
  'A',
  'AAAA',
  'CNAME',
  'TXT',
  'MX',
  'SRV',
  'CAA',
  'NS',
  'SOA',
  'PTR',
  'TLSA',
  'HTTPS',
  'SVCB',
] as const;

export type SupportedDnsRecordType = (typeof SUPPORTED_DNS_RECORD_TYPES)[number];
