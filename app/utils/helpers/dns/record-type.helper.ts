import { SUPPORTED_DNS_RECORD_TYPES, SupportedDnsRecordType } from './constants';

// =============================================================================
// DNS Record Type Helpers
// =============================================================================

/**
 * Get sort priority for DNS record types
 * Lower numbers appear first in sorted lists
 * Uses the order defined in SUPPORTED_DNS_RECORD_TYPES constant
 */
export function getDnsRecordTypePriority(recordType: SupportedDnsRecordType): number {
  const index = SUPPORTED_DNS_RECORD_TYPES.indexOf(recordType);
  return index === -1 ? 999 : index + 1;
}

/**
 * Convert TTL (in seconds) to human-readable format
 * Examples: 3600 -> "1 hr", 300 -> "5 min", 86400 -> "1 day"
 */
export function formatTTL(ttlSeconds?: number): string {
  if (!ttlSeconds) return 'Auto';

  const days = Math.floor(ttlSeconds / 86400);
  const hours = Math.floor((ttlSeconds % 86400) / 3600);
  const minutes = Math.floor((ttlSeconds % 3600) / 60);
  const seconds = ttlSeconds % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds} sec${seconds > 1 ? 's' : ''}`);

  // Return first two most significant units
  return parts.slice(0, 2).join(' ');
}

/**
 * Parse SVCB/HTTPS params string into key-value object
 * Example: 'alpn="h3,h2" ipv4hint="127.0.0.1"' -> { alpn: "h3,h2", ipv4hint: "127.0.0.1" }
 */
export function parseSvcbParams(input?: string): Record<string, string> {
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
 * Format SVCB/HTTPS params object to string representation
 * Example: { alpn: "h3,h2", ipv4hint: "127.0.0.1" } -> 'alpn=h3,h2 ipv4hint=127.0.0.1'
 */
export function formatSvcbParams(params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return '';

  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
}

// =============================================================================
// Quote Normalization Helpers (RFC 1035 Compliant)
// =============================================================================

/**
 * Unescape characters in a quoted string value
 * Handles: \" -> ", \\ -> \
 */
function unescapeQuotedValue(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

/**
 * Strip outer double quotes from a string if present
 */
function stripOuterQuotes(value: string): string {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Normalize a quoted string value for internal storage
 * - Strips outer double quotes if present
 * - Handles escaped characters: \" -> ", \\ -> \
 * - Concatenates multi-string values ("str1" "str2" -> "str1str2")
 *
 * @param value - Raw value (may be quoted or unquoted)
 * @returns Normalized unquoted value
 */
export function normalizeQuotedValue(value: string): string {
  if (!value) return value;

  const trimmed = value.trim();

  // Handle multi-string format: "string1" "string2" -> concatenate
  const multiStringRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  const matches = [...trimmed.matchAll(multiStringRegex)];

  if (matches.length > 0) {
    // Concatenate all quoted strings, unescape internal chars
    return unescapeQuotedValue(matches.map((m) => m[1]).join(''));
  }

  // Single value - strip outer quotes and unescape
  return unescapeQuotedValue(stripOuterQuotes(trimmed));
}

/**
 * Normalize TXT record value for internal storage (RFC 1035 compliant)
 *
 * Per RFC 1035 and Cloudflare/Google Cloud DNS standards:
 * - TXT records in BIND zone files must be quoted
 * - Internal storage should be unquoted (the actual value)
 * - Records with contents `hello` and `"hello"` are byte-for-byte identical
 *
 * @param value - Raw TXT value (may be quoted or unquoted)
 * @returns Normalized unquoted value for internal storage
 */
export function normalizeTxtValue(value: string): string {
  return normalizeQuotedValue(value);
}

/**
 * Normalize CAA record value for internal storage
 *
 * CAA format: <flag> <tag> "<value>"
 * Internal storage: <flag> <tag> <value> (without quotes around value)
 *
 * @param value - Raw CAA value (e.g., '0 issue "letsencrypt.org"')
 * @returns Normalized value (e.g., '0 issue letsencrypt.org')
 */
export function normalizeCaaValue(value: string): string {
  if (!value) return value;

  // Match: <flag> <tag> "<value>" or <flag> <tag> <value>
  const match = value.trim().match(/^(\d+)\s+(\w+)\s+"?([^"]*)"?$/);
  if (match) {
    const [, flag, tag, caaValue] = match;
    return `${flag} ${tag} ${caaValue}`;
  }

  return value;
}

// =============================================================================
// FQDN Normalization Helpers (RFC 1035 Compliant)
// =============================================================================

/**
 * DNS record types that require FQDN normalization (trailing dot)
 * Maps record type to the field path(s) that contain domain names
 *
 * These fields need:
 * - Trailing dot added when sending to backend (ensureFqdn)
 * - Trailing dot stripped when editing in forms (normalizeDomainName)
 * - Trailing dot stripped when comparing for duplicates (normalizeDomainName)
 *
 * Record types NOT requiring FQDN: A, AAAA, TXT, CAA, TLSA (IP addresses, text, cert data)
 */
export const FQDN_FIELDS: Record<string, string[]> = {
  CNAME: ['content'],
  ALIAS: ['content'],
  NS: ['content'],
  PTR: ['content'],
  MX: ['exchange'],
  SRV: ['target'],
  SOA: ['mname', 'rname'],
  HTTPS: ['target'],
  SVCB: ['target'],
  DNAME: ['content'], // Future-proofing
};

/**
 * Ensure domain name ends with a trailing dot (FQDN format)
 * Per RFC 1035, absolute domain names end with a dot
 *
 * Used when: submitting to backend, BIND import
 *
 * @param value - Domain name (may or may not have trailing dot)
 * @returns Domain name with trailing dot (FQDN format)
 */
export function ensureFqdn(value: string | undefined | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

/**
 * Get the field names that require FQDN normalization for a record type
 */
export function getFqdnFields(recordType: string): string[] {
  return FQDN_FIELDS[recordType] || [];
}

/**
 * Check if a record type has domain name fields requiring FQDN handling
 */
export function hasFqdnFields(recordType: string): boolean {
  return recordType in FQDN_FIELDS;
}

/**
 * Apply a transformation function to FQDN fields in record data
 * Returns a new object with transformed domain name fields
 *
 * @param recordType - DNS record type (e.g., 'MX', 'CNAME')
 * @param data - Record data object
 * @param transform - Function to apply (ensureFqdn or normalizeDomainName)
 * @returns New object with transformed FQDN fields
 */
export function transformFqdnFields<T extends Record<string, unknown>>(
  recordType: string,
  data: T,
  transform: (value: string) => string
): T {
  const fields = FQDN_FIELDS[recordType];
  if (!fields || fields.length === 0) return data;

  const result = { ...data };
  for (const field of fields) {
    if (field in result && typeof result[field] === 'string') {
      (result as Record<string, unknown>)[field] = transform(result[field] as string);
    }
  }
  return result;
}
