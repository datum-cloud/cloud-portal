import { CreateDnsRecordSchema, DNSRecordType } from '@/resources/schemas/dns-record.schema';

export interface PreviewField {
  label: string;
  value: string;
}

/**
 * Truncate string to maximum length with ellipsis
 */
function truncate(str: string | undefined | null, maxLen: number): string {
  if (!str) return '-';
  return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
}

/**
 * Extract preview fields based on record type schema
 * Shows the most relevant fields for each DNS record type
 */
export function getPreviewFields(
  recordType: DNSRecordType,
  data: CreateDnsRecordSchema
): PreviewField[] {
  // Common fields for all record types
  const common: PreviewField[] = [
    { label: 'Name', value: data.name || '-' },
    { label: 'TTL', value: data.ttl ? `${data.ttl}s` : 'Auto' },
  ];

  // Type-specific fields based on schema - using type guards
  let typeSpecific: PreviewField[] = [];

  switch (recordType) {
    case 'A':
      if ('a' in data) {
        typeSpecific = [{ label: 'IPv4', value: truncate(data.a?.content, 20) }];
      }
      break;
    case 'AAAA':
      if ('aaaa' in data) {
        typeSpecific = [{ label: 'IPv6', value: truncate(data.aaaa?.content, 25) }];
      }
      break;
    case 'CNAME':
      if ('cname' in data) {
        typeSpecific = [{ label: 'Target', value: truncate(data.cname?.content, 25) }];
      }
      break;
    case 'TXT':
      if ('txt' in data) {
        typeSpecific = [{ label: 'Text', value: truncate(data.txt?.content, 30) }];
      }
      break;
    case 'MX':
      if ('mx' in data) {
        typeSpecific = [
          { label: 'Server', value: truncate(data.mx?.exchange, 20) },
          { label: 'Priority', value: String(data.mx?.preference ?? '-') },
        ];
      }
      break;
    case 'SRV':
      if ('srv' in data) {
        typeSpecific = [
          { label: 'Target', value: truncate(data.srv?.target, 20) },
          { label: 'Port', value: String(data.srv?.port ?? '-') },
          { label: 'Priority', value: String(data.srv?.priority ?? '-') },
        ];
      }
      break;
    case 'CAA':
      if ('caa' in data) {
        typeSpecific = [
          { label: 'Tag', value: data.caa?.tag || '-' },
          { label: 'Value', value: truncate(data.caa?.value, 20) },
          { label: 'Flag', value: String(data.caa?.flag ?? '-') },
        ];
      }
      break;
    case 'NS':
      if ('ns' in data) {
        typeSpecific = [{ label: 'Nameserver', value: truncate(data.ns?.content, 25) }];
      }
      break;
    case 'SOA':
      if ('soa' in data) {
        typeSpecific = [
          { label: 'Primary NS', value: truncate(data.soa?.mname, 20) },
          { label: 'Email', value: truncate(data.soa?.rname, 20) },
          { label: 'Refresh', value: data.soa?.refresh ? `${data.soa.refresh}s` : '-' },
        ];
      }
      break;
    case 'PTR':
      if ('ptr' in data) {
        typeSpecific = [{ label: 'Target', value: truncate(data.ptr?.content, 25) }];
      }
      break;
    case 'TLSA':
      if ('tlsa' in data) {
        typeSpecific = [
          { label: 'Usage', value: String(data.tlsa?.usage ?? '-') },
          { label: 'Selector', value: String(data.tlsa?.selector ?? '-') },
          { label: 'Match Type', value: String(data.tlsa?.matchingType ?? '-') },
        ];
      }
      break;
    case 'HTTPS':
      if ('https' in data) {
        typeSpecific = [
          { label: 'Target', value: truncate(data.https?.target, 20) },
          { label: 'Priority', value: String(data.https?.priority ?? '-') },
          { label: 'Params', value: truncate(data.https?.params, 20) },
        ];
      }
      break;
    case 'SVCB':
      if ('svcb' in data) {
        typeSpecific = [
          { label: 'Target', value: truncate(data.svcb?.target, 20) },
          { label: 'Priority', value: String(data.svcb?.priority ?? '-') },
          { label: 'Params', value: truncate(data.svcb?.params, 20) },
        ];
      }
      break;
  }

  return [...common, ...typeSpecific];
}
