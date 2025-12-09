/**
 * BIND Zone File Parser Types
 * RFC 1035 compliant type definitions
 */

// =============================================================================
// DNS Record Types
// =============================================================================

export type DNSRecordType =
  | 'A'
  | 'AAAA'
  | 'CNAME'
  | 'MX'
  | 'TXT'
  | 'NS'
  | 'PTR'
  | 'SRV'
  | 'CAA'
  | 'SOA'
  | 'TLSA'
  | 'HTTPS'
  | 'SVCB';

// =============================================================================
// Parsed Record Output
// =============================================================================

export interface ParsedDnsRecord {
  name: string;
  ttl: number | null;
  type: DNSRecordType;
  value: string;
  data: Record<string, unknown>;
}

export interface BindParseResult {
  records: ParsedDnsRecord[];
  errors: string[];
  warnings: string[];
}

// =============================================================================
// Preprocessor Types
// =============================================================================

export interface PreprocessResult {
  lines: string[];
  origin: string | null;
  defaultTTL: number | null;
}

// =============================================================================
// Tokenizer Types
// =============================================================================

export interface RawRecordLine {
  name: string;
  ttl: number | null;
  class: string;
  type: string;
  rdata: string;
}

// =============================================================================
// Type-Specific Data Interfaces
// =============================================================================

export interface SoaData {
  mname: string;
  rname: string;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minimum: number;
}

export interface MxData {
  preference: number;
  exchange: string;
}

export interface SrvData {
  priority: number;
  weight: number;
  port: number;
  target: string;
}

export interface CaaData {
  flag: number;
  tag: string;
  value: string;
}

export interface TlsaData {
  usage: number;
  selector: number;
  matchingType: number;
  certData: string;
}

export interface HttpsSvcbData {
  priority: number;
  target: string;
  params: Record<string, string>;
}

export interface SimpleContentData {
  content: string;
}
