/**
 * BIND Zone File RDATA Parsers
 * Type-specific parsers for DNS record data
 */

/**
 * Remove trailing dot from a hostname (FQDN -> relative)
 */
function stripTrailingDot(hostname: string): string {
  return hostname.replace(/\.$/, '');
}

/**
 * Parse A record rdata
 * Format: <ipv4-address>
 */
export function parseARecord(rdata: string): Record<string, unknown> {
  return { content: rdata.trim() };
}

/**
 * Parse AAAA record rdata
 * Format: <ipv6-address>
 */
export function parseAaaaRecord(rdata: string): Record<string, unknown> {
  return { content: rdata.trim() };
}

/**
 * Parse CNAME record rdata
 * Format: <canonical-name>
 */
export function parseCnameRecord(rdata: string): Record<string, unknown> {
  return { content: stripTrailingDot(rdata.trim()) };
}

/**
 * Parse NS record rdata
 * Format: <nameserver>
 */
export function parseNsRecord(rdata: string): Record<string, unknown> {
  return { content: stripTrailingDot(rdata.trim()) };
}

/**
 * Parse PTR record rdata
 * Format: <domain-name>
 */
export function parsePtrRecord(rdata: string): Record<string, unknown> {
  return { content: stripTrailingDot(rdata.trim()) };
}

/**
 * Parse MX record rdata
 * Format: <preference> <exchange>
 */
export function parseMxRecord(rdata: string): Record<string, unknown> {
  const parts = rdata.trim().split(/\s+/);
  return {
    preference: parseInt(parts[0], 10) || 0,
    exchange: stripTrailingDot(parts[1] || ''),
  };
}

/**
 * Parse TXT record rdata
 * Format: "<text>" or "<text1>" "<text2>" (concatenated)
 * Handles quoted strings and concatenation
 */
export function parseTxtRecord(rdata: string): Record<string, unknown> {
  const trimmed = rdata.trim();

  // Handle multiple quoted strings (concatenation)
  // Extract all quoted segments and join them
  const quotedSegments: string[] = [];
  const quoteRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let match;

  while ((match = quoteRegex.exec(trimmed)) !== null) {
    // Unescape escaped characters
    const segment = match[1].replace(/\\(.)/g, '$1');
    quotedSegments.push(segment);
  }

  if (quotedSegments.length > 0) {
    // Join all quoted segments
    return { content: quotedSegments.join('') };
  }

  // No quotes found - return as-is (shouldn't happen in valid BIND files)
  return { content: trimmed };
}

/**
 * Ensure hostname has trailing dot (FQDN format)
 * This is the standard format for SOA mname/rname fields
 */
function ensureTrailingDot(hostname: string): string {
  if (!hostname) return '';
  return hostname.endsWith('.') ? hostname : hostname + '.';
}

/**
 * Parse SOA record rdata
 * Format: <mname> <rname> <serial> <refresh> <retry> <expire> <minimum>
 * After preprocessing, this will be a single line with all values
 *
 * Note: mname and rname keep trailing dots to match API format
 * Uses 'ttl' field name instead of 'minimum' to match API format
 */
export function parseSoaRecord(rdata: string): Record<string, unknown> {
  const parts = rdata.trim().split(/\s+/);

  return {
    mname: ensureTrailingDot(parts[0] || ''),
    rname: ensureTrailingDot(parts[1] || ''),
    serial: parseInt(parts[2], 10) || 0,
    refresh: parseInt(parts[3], 10) || 0,
    retry: parseInt(parts[4], 10) || 0,
    expire: parseInt(parts[5], 10) || 0,
    ttl: parseInt(parts[6], 10) || 0,
  };
}

/**
 * Parse SRV record rdata
 * Format: <priority> <weight> <port> <target>
 */
export function parseSrvRecord(rdata: string): Record<string, unknown> {
  const parts = rdata.trim().split(/\s+/);

  return {
    priority: parseInt(parts[0], 10) || 0,
    weight: parseInt(parts[1], 10) || 0,
    port: parseInt(parts[2], 10) || 0,
    target: stripTrailingDot(parts[3] || ''),
  };
}

/**
 * Parse CAA record rdata
 * Format: <flags> <tag> <value>
 * Value may be quoted
 */
export function parseCaaRecord(rdata: string): Record<string, unknown> {
  const trimmed = rdata.trim();

  // Match: flags tag "value" or flags tag value
  const match = trimmed.match(/^(\d+)\s+(\S+)\s+(?:"([^"]*)"|(\S+))$/);

  if (match) {
    return {
      flag: parseInt(match[1], 10),
      tag: match[2],
      value: match[3] ?? match[4] ?? '',
    };
  }

  // Fallback parsing
  const parts = trimmed.split(/\s+/);
  let value = parts.slice(2).join(' ');
  // Remove surrounding quotes if present
  value = value.replace(/^["']+|["']+$/g, '');

  return {
    flag: parseInt(parts[0], 10) || 0,
    tag: parts[1] || '',
    value,
  };
}

/**
 * Parse TLSA record rdata
 * Format: <usage> <selector> <matching-type> <cert-data>
 */
export function parseTlsaRecord(rdata: string): Record<string, unknown> {
  const parts = rdata.trim().split(/\s+/);

  return {
    usage: parseInt(parts[0], 10) || 0,
    selector: parseInt(parts[1], 10) || 0,
    matchingType: parseInt(parts[2], 10) || 0,
    certData: parts.slice(3).join(''), // Certificate data may be split
  };
}

/**
 * Parse SVCB/HTTPS params string
 * Format: key=value or key="value" pairs
 */
function parseSvcParams(paramsStr: string): Record<string, string> {
  if (!paramsStr?.trim()) return {};

  const params: Record<string, string> = {};
  // Match key="value" or key=value patterns
  const regex = /(\w+)=(?:"([^"]*)"|(\S+))/g;
  let match;

  while ((match = regex.exec(paramsStr)) !== null) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? '';
    params[key] = value;
  }

  return params;
}

/**
 * Parse HTTPS record rdata
 * Format: <priority> <target> [params...]
 */
export function parseHttpsRecord(rdata: string): Record<string, unknown> {
  const trimmed = rdata.trim();
  const parts = trimmed.split(/\s+/);

  const priority = parseInt(parts[0], 10) || 0;
  const target = parts[1] === '.' ? '' : stripTrailingDot(parts[1] || '');

  // Everything after priority and target is params
  const paramsStr = parts.slice(2).join(' ');
  const params = parseSvcParams(paramsStr);

  return { priority, target, params };
}

/**
 * Parse SVCB record rdata
 * Format: <priority> <target> [params...]
 */
export function parseSvcbRecord(rdata: string): Record<string, unknown> {
  // Same format as HTTPS
  return parseHttpsRecord(rdata);
}

/**
 * Main rdata parser dispatcher
 * Routes to type-specific parsers
 */
export function parseRdata(type: string, rdata: string): Record<string, unknown> {
  switch (type.toUpperCase()) {
    case 'A':
      return parseARecord(rdata);
    case 'AAAA':
      return parseAaaaRecord(rdata);
    case 'ALIAS':
      return parseCnameRecord(rdata);
    case 'CNAME':
      return parseCnameRecord(rdata);
    case 'NS':
      return parseNsRecord(rdata);
    case 'PTR':
      return parsePtrRecord(rdata);
    case 'MX':
      return parseMxRecord(rdata);
    case 'TXT':
      return parseTxtRecord(rdata);
    case 'SOA':
      return parseSoaRecord(rdata);
    case 'SRV':
      return parseSrvRecord(rdata);
    case 'CAA':
      return parseCaaRecord(rdata);
    case 'TLSA':
      return parseTlsaRecord(rdata);
    case 'HTTPS':
      return parseHttpsRecord(rdata);
    case 'SVCB':
      return parseSvcbRecord(rdata);
    default:
      // Unknown type - return raw rdata
      return { content: rdata.trim() };
  }
}
