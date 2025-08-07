/**
 * CloudValid API Types
 */

export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV' | 'NS' | 'PTR';

export interface RawDNSRecord {
  type: DNSRecordType;
  host: string;
  content: string;
  priority?: number;
  create_service_record?: boolean;
}

export interface CreateDNSSetupRequest {
  domain: string;
  template_id?: string;
  variables?: Record<string, any>;
  raw_dns_records?: RawDNSRecord[];
  redirect_url?: string;
  expire_days?: number;
}

export interface CreateDNSSetupResponse {
  id: string;
  domain: string;
  public_url: string;
  status: string;
}

export interface DNSSetupDetails {
  id: string;
  domain: string;
  public_url: string;
  status: string;
  records: any[];
}

export interface UpdateServiceRecordsRequest {
  type_filter: DNSRecordType;
  host_filter: string;
  content_filter?: string;
  domain_filter: string;
  new_type?: DNSRecordType;
  new_content: string;
  new_comment?: string;
}

export interface ServiceRecord {
  id: string;
  domain: string;
  type: DNSRecordType;
  host: string;
  content: string;
  priority?: number;
}

export interface ServiceRecordsResponse {
  records: ServiceRecord[];
  total: number;
  page: number;
  per_page: number;
}
