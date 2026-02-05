/**
 * BIND Zone File Tokenizer
 * Parses individual record lines into structured tokens
 */
import type { RawRecordLine } from './types';

// Known DNS record types for parsing
const KNOWN_RECORD_TYPES = new Set([
  'A',
  'AAAA',
  'ALIAS',
  'CNAME',
  'MX',
  'TXT',
  'NS',
  'PTR',
  'SRV',
  'CAA',
  'SOA',
  'TLSA',
  'HTTPS',
  'SVCB',
  'SPF',
  'DS',
  'DNSKEY',
  'RRSIG',
  'NSEC',
  'NSEC3',
  'DNAME',
]);

// DNS classes
const DNS_CLASSES = new Set(['IN', 'CH', 'HS', 'NONE', 'ANY']);

/**
 * Check if a token is a TTL value (numeric)
 */
function isTTL(token: string): boolean {
  return /^\d+$/.test(token);
}

/**
 * Check if a token is a DNS class
 */
function isClass(token: string): boolean {
  return DNS_CLASSES.has(token.toUpperCase());
}

/**
 * Check if a token is a known record type
 */
function isRecordType(token: string): boolean {
  return KNOWN_RECORD_TYPES.has(token.toUpperCase());
}

/**
 * Split a line into tokens, respecting quoted strings
 */
function tokenizeLine(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
      current += char;
    } else if (/\s/.test(char) && !inQuotes) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse a single record line into structured fields
 *
 * BIND record format variations:
 * - name ttl class type rdata
 * - name class ttl type rdata
 * - name class type rdata
 * - name ttl type rdata
 * - name type rdata
 * - (blank) ttl class type rdata (inherits previous name)
 *
 * @param line - The preprocessed record line
 * @param previousName - Name from previous record (for inheritance)
 * @returns Parsed record line or null if invalid
 */
export function tokenizeRecordLine(line: string, previousName: string): RawRecordLine | null {
  const tokens = tokenizeLine(line);

  if (tokens.length < 2) {
    return null;
  }

  let name = '';
  let ttl: number | null = null;
  let recordClass = 'IN';
  let type = '';
  let rdataStartIndex = 0;

  // Determine the structure based on first token
  let currentIndex = 0;

  // Check if first token is a name, TTL, class, or type
  const firstToken = tokens[0];

  if (isTTL(firstToken)) {
    // Line starts with TTL - inherit previous name
    name = previousName;
    ttl = parseInt(firstToken, 10);
    currentIndex = 1;
  } else if (isClass(firstToken)) {
    // Line starts with class - inherit previous name
    name = previousName;
    recordClass = firstToken.toUpperCase();
    currentIndex = 1;
  } else if (isRecordType(firstToken)) {
    // Line starts with type - inherit previous name
    name = previousName;
    type = firstToken.toUpperCase();
    currentIndex = 1;
  } else {
    // First token is the name
    name = firstToken;
    currentIndex = 1;
  }

  // Parse remaining tokens to find TTL, class, and type
  while (currentIndex < tokens.length && !type) {
    const token = tokens[currentIndex];

    if (!ttl && isTTL(token)) {
      ttl = parseInt(token, 10);
      currentIndex++;
    } else if (recordClass === 'IN' && isClass(token)) {
      recordClass = token.toUpperCase();
      currentIndex++;
    } else if (isRecordType(token)) {
      type = token.toUpperCase();
      currentIndex++;
      break;
    } else {
      // Unknown token before type - might be malformed
      currentIndex++;
    }
  }

  if (!type) {
    return null;
  }

  rdataStartIndex = currentIndex;

  // Everything after the type is rdata
  const rdataTokens = tokens.slice(rdataStartIndex);
  const rdata = rdataTokens.join(' ');

  return {
    name,
    ttl,
    class: recordClass,
    type,
    rdata,
  };
}
