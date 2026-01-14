import { normalizeDomainName } from './record-comparison.helper';
import {
  ensureFqdn,
  formatSvcbParams,
  parseSvcbParams,
  transformFqdnFields,
} from './record-type.helper';
import { ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet } from '@/modules/control-plane/dns-networking';
import { IFlattenedDnsRecord } from '@/resources/dns-records';
import { CreateDnsRecordSchema } from '@/resources/dns-records';

// =============================================================================
// Transformation Helpers: Form ↔ K8s RecordSet
// =============================================================================

/**
 * Transform UI form data to K8s Record format
 * Converts CreateDnsRecordSchema to DNSRecordSet['spec']['records'][0]
 */
export function transformFormToRecord(
  formData: CreateDnsRecordSchema
): ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['records'][0] {
  const { recordType, name, ttl, ...typeData } = formData as any;

  const record: any = {
    name: name || '@',
    // Only include ttl if it's not null/undefined (null means "Auto" - use default TTL)
    ...(ttl != null && { ttl }),
  };

  // Map type-specific fields to K8s format
  switch (recordType) {
    case 'A':
      // Form: { a: { content: string } }
      // K8s:  { a: { content: string } }
      if (typeData.a) {
        record.a = { content: typeData.a.content };
      }
      break;

    case 'AAAA':
      // Form: { aaaa: { content: string } }
      // K8s:  { aaaa: { content: string } }
      if (typeData.aaaa) {
        record.aaaa = { content: typeData.aaaa.content };
      }
      break;

    case 'CNAME':
      // Form: { cname: { content: string } }
      // K8s:  { cname: { content: string } } - with FQDN trailing dot
      if (typeData.cname) {
        record.cname = transformFqdnFields('CNAME', typeData.cname, ensureFqdn);
      }
      break;

    case 'ALIAS':
      // Form: { alias: { content: string } }
      // K8s:  { alias: { content: string } } - with FQDN trailing dot
      if (typeData.alias) {
        record.alias = transformFqdnFields('ALIAS', typeData.alias, ensureFqdn);
      }
      break;

    case 'TXT':
      // Form: { txt: { content: string } }
      // K8s:  { txt: { content: string } }
      if (typeData.txt) {
        record.txt = { content: typeData.txt.content };
      }
      break;

    case 'NS':
      // Form: { ns: { content: string } }
      // K8s:  { ns: { content: string } } - with FQDN trailing dot
      if (typeData.ns) {
        record.ns = transformFqdnFields('NS', typeData.ns, ensureFqdn);
      }
      break;

    case 'PTR':
      // Form: { ptr: { content: string } }
      // K8s:  { ptr: { content: string } } - with FQDN trailing dot
      if (typeData.ptr) {
        record.ptr = transformFqdnFields('PTR', typeData.ptr, ensureFqdn);
      }
      break;

    case 'MX':
      // Form: { mx: { exchange, preference } }
      // K8s:  { mx: { exchange, preference } } - exchange with FQDN trailing dot
      if (typeData.mx) {
        record.mx = transformFqdnFields('MX', typeData.mx, ensureFqdn);
      }
      break;

    case 'SRV':
      // Form: { srv: { priority, weight, port, target } }
      // K8s:  { srv: { priority, weight, port, target } } - target with FQDN trailing dot
      if (typeData.srv) {
        record.srv = transformFqdnFields('SRV', typeData.srv, ensureFqdn);
      }
      break;

    case 'CAA':
      // Form: { caa: { flag, tag, value } }
      // K8s:  { caa: { flag, tag, value } }
      if (typeData.caa) {
        record.caa = typeData.caa;
      }
      break;

    case 'TLSA':
      // Form: { tlsa: { usage, selector, matchingType, certData } }
      // K8s:  { tlsa: { usage, selector, matchingType, certData } }
      if (typeData.tlsa) {
        record.tlsa = typeData.tlsa;
      }
      break;

    case 'HTTPS':
      // Form: { https: { priority, target, params: string } }
      // K8s:  { https: { priority, target, params: Record<string, string> } } - target with FQDN trailing dot
      if (typeData.https) {
        record.https = transformFqdnFields(
          'HTTPS',
          {
            priority: typeData.https.priority,
            target: typeData.https.target,
            params: parseSvcbParams(typeData.https.params),
          },
          ensureFqdn
        );
      }
      break;

    case 'SVCB':
      // Form: { svcb: { priority, target, params: string } }
      // K8s:  { svcb: { priority, target, params: Record<string, string> } } - target with FQDN trailing dot
      if (typeData.svcb) {
        record.svcb = transformFqdnFields(
          'SVCB',
          {
            priority: typeData.svcb.priority,
            target: typeData.svcb.target,
            params: parseSvcbParams(typeData.svcb.params),
          },
          ensureFqdn
        );
      }
      break;

    case 'SOA':
      // Form: { soa: { mname, rname, ... } }
      // K8s:  { soa: { mname, rname, ... } } - mname/rname with FQDN trailing dot
      if (typeData.soa) {
        record.soa = transformFqdnFields('SOA', typeData.soa, ensureFqdn);
      }
      break;
  }

  return record;
}

/**
 * Transform flattened DNS record to form default value
 * Inverse of transformFormToRecord() - converts IFlattenedDnsRecord → CreateDnsRecordSchema
 *
 * Used when editing existing records in both inline and modal forms
 */
export function recordToFormDefaultValue(
  record: IFlattenedDnsRecord
): Omit<CreateDnsRecordSchema, 'dnsZoneRef'> {
  const base = {
    recordType: record.type as any,
    name: record.name,
    ttl: record.ttl,
  };

  // Use rawData (K8s record) to reconstruct form values
  const rawData = record.rawData;

  switch (record.type) {
    // Simple types - extract from value string
    case 'A':
      return { ...base, a: { content: record.value || '' } } as any;
    case 'AAAA':
      return { ...base, aaaa: { content: record.value || '' } } as any;
    case 'TXT':
      return { ...base, txt: { content: record.value || '' } } as any;

    // Domain name types - strip trailing dot for form editing
    case 'CNAME':
      return {
        ...base,
        cname: { content: normalizeDomainName(record.value) },
      } as any;
    case 'ALIAS':
      return {
        ...base,
        alias: { content: normalizeDomainName(record.value) },
      } as any;
    case 'NS':
      return {
        ...base,
        ns: { content: normalizeDomainName(record.value) },
      } as any;
    case 'PTR':
      return {
        ...base,
        ptr: { content: normalizeDomainName(record.value) },
      } as any;

    // Complex types - use rawData (K8s format), strip trailing dots from domain fields
    case 'MX':
      return {
        ...base,
        mx: rawData?.mx
          ? transformFqdnFields('MX', rawData.mx, normalizeDomainName)
          : { exchange: '', preference: 10 },
      } as any;
    case 'SRV':
      return {
        ...base,
        srv: rawData?.srv
          ? transformFqdnFields('SRV', rawData.srv, normalizeDomainName)
          : { target: '', port: 443, priority: 10, weight: 5 },
      } as any;
    case 'CAA':
      return {
        ...base,
        caa: rawData?.caa || { flag: 0, tag: 'issue', value: '' },
      } as any;
    case 'TLSA':
      return {
        ...base,
        tlsa: rawData?.tlsa || { usage: 3, selector: 1, matchingType: 1, certData: '' },
      } as any;

    // HTTPS/SVCB - convert params object → string, strip trailing dots from target
    case 'HTTPS':
      return {
        ...base,
        https: rawData?.https
          ? {
              priority: rawData.https.priority,
              target: normalizeDomainName(rawData.https.target),
              params: formatSvcbParams(rawData.https.params),
            }
          : { priority: 1, target: '', params: '' },
      } as any;
    case 'SVCB':
      return {
        ...base,
        svcb: rawData?.svcb
          ? {
              priority: rawData.svcb.priority,
              target: normalizeDomainName(rawData.svcb.target),
              params: formatSvcbParams(rawData.svcb.params),
            }
          : { priority: 1, target: '', params: '' },
      } as any;

    // SOA - parse JSON value, strip trailing dots from mname/rname
    case 'SOA':
      try {
        const soa = JSON.parse(record.value || '{}');
        return {
          ...base,
          soa: transformFqdnFields(
            'SOA',
            {
              mname: soa.mname || '',
              rname: soa.rname || '',
              refresh: soa.refresh || 3600,
              retry: soa.retry || 600,
              expire: soa.expire || 86400,
              ttl: soa.ttl || 3600,
            },
            normalizeDomainName
          ),
        } as any;
      } catch {
        return {
          ...base,
          soa: {
            mname: '',
            rname: '',
            refresh: 3600,
            retry: 600,
            expire: 86400,
            ttl: 3600,
          },
        } as any;
      }

    default:
      return base as any;
  }
}
