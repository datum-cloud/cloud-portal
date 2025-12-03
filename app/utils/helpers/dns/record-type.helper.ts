import { SupportedDnsRecordType } from './constants';

// =============================================================================
// DNS Record Type Helpers
// =============================================================================

/**
 * Get sort priority for DNS record types
 * Lower numbers appear first in sorted lists
 */
export function getDnsRecordTypePriority(recordType: SupportedDnsRecordType): number {
  const priorities: Record<SupportedDnsRecordType, number> = {
    SOA: 1,
    NS: 2,
    A: 3,
    AAAA: 4,
    CNAME: 5,
    MX: 6,
    TXT: 7,
    SRV: 8,
    CAA: 9,
    PTR: 10,
    TLSA: 11,
    HTTPS: 12,
    SVCB: 13,
  };

  return priorities[recordType] || 999;
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
 * Example: { alpn: "h3,h2", ipv4hint: "127.0.0.1" } -> 'alpn="h3,h2" ipv4hint="127.0.0.1"'
 */
export function formatSvcbParams(params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return '';

  return Object.entries(params)
    .map(([key, value]) => `${key}="${value}"`)
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
