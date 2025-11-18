import { DnsRecordForm } from '../../form/dns-record-form';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { CreateDnsRecordSchema } from '@/resources/schemas/dns-record.schema';

interface DnsRecordInlineFormProps {
  mode: 'create' | 'edit';
  initialData: IFlattenedDnsRecord | null;
  projectId: string;
  dnsZoneId: string;
  dnsZoneName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Inline form wrapper for creating/editing DNS records in DataTable
 * Uses the comprehensive DnsRecordForm component with full validation
 */
export function DnsRecordInlineForm({
  mode,
  initialData,
  projectId,
  dnsZoneId,
  dnsZoneName,
  onClose,
  onSuccess,
}: DnsRecordInlineFormProps) {
  // Transform flattened data to schema format if needed
  const defaultValue: CreateDnsRecordSchema | undefined = initialData
    ? ({
        recordType: initialData.type as any,
        name: initialData.name,
        ttl: initialData.ttl,

        // Simple types (single object)
        ...(initialData.type === 'A' && { a: { content: initialData.value || '' } }),
        ...(initialData.type === 'AAAA' && { aaaa: { content: initialData.value || '' } }),
        ...(initialData.type === 'CNAME' && { cname: { content: initialData.value || '' } }),
        ...(initialData.type === 'TXT' && { txt: { content: initialData.value || '' } }),
        ...(initialData.type === 'NS' && { ns: { content: initialData.value || '' } }),
        ...(initialData.type === 'PTR' && { ptr: { content: initialData.value || '' } }),

        // Complex types (use raw K8s data from record)
        ...(initialData.type === 'MX' && {
          mx: initialData.rawData?.mx || {
            exchange: '',
            preference: 10,
          },
        }),
        ...(initialData.type === 'SRV' && {
          srv: initialData.rawData?.srv || {
            target: '',
            port: 443,
            priority: 10,
            weight: 5,
          },
        }),
        ...(initialData.type === 'CAA' && {
          caa: initialData.rawData?.caa || {
            flag: 0,
            tag: 'issue',
            value: '',
          },
        }),
        ...(initialData.type === 'TLSA' && {
          tlsa: initialData.rawData?.tlsa || {
            usage: 3,
            selector: 1,
            matchingType: 1,
            certData: '',
          },
        }),
        ...(initialData.type === 'HTTPS' && {
          https: initialData.rawData?.https || {
            priority: 1,
            target: '',
            params: {},
          },
        }),
        ...(initialData.type === 'SVCB' && {
          svcb: initialData.rawData?.svcb || {
            priority: 1,
            target: '',
            params: {},
          },
        }),
        ...(initialData.type === 'SOA' &&
          (() => {
            try {
              // Parse JSON-encoded SOA object
              const soa = JSON.parse(initialData.value || '{}');
              return {
                soa: {
                  mname: soa.mname || '',
                  rname: soa.rname || '',
                  refresh: soa.refresh || 3600,
                  retry: soa.retry || 600,
                  expire: soa.expire || 86400,
                  ttl: soa.ttl || 3600,
                },
              };
            } catch {
              // Fallback to empty SOA if parsing fails
              return {
                soa: {
                  mname: '',
                  rname: '',
                  refresh: 3600,
                  retry: 600,
                  expire: 86400,
                  ttl: 3600,
                },
              };
            }
          })()),

        dnsZoneRef: dnsZoneName ? { name: dnsZoneName } : undefined,
      } as CreateDnsRecordSchema)
    : undefined;

  return (
    <DnsRecordForm
      mode={mode}
      defaultValue={defaultValue}
      projectId={projectId}
      dnsZoneId={dnsZoneId}
      dnsZoneName={dnsZoneName}
      recordSetName={initialData?.recordSetName}
      recordName={initialData?.name}
      oldValue={initialData?.value} // Pass the original value for edit mode
      oldTTL={initialData?.ttl ?? null} // Pass the original TTL for edit mode
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
