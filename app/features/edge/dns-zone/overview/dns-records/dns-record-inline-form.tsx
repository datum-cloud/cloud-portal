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

        // Array types (wrap in array) - TODO: enhance based on IFlattenedDnsRecord structure
        ...(initialData.type === 'MX' && {
          mx: [
            {
              // Decode pipe-separated format: "preference|exchange"
              exchange: initialData.value?.split('|')[1] || '',
              preference: Number(initialData.value?.split('|')[0]) || 10,
            },
          ],
        }),
        ...(initialData.type === 'SRV' && {
          srv: [
            {
              target: initialData.value || '',
              port: (initialData as any).port || 443,
              priority: (initialData as any).priority || 10,
              weight: (initialData as any).weight || 5,
            },
          ],
        }),
        ...(initialData.type === 'CAA' && {
          caa: [
            {
              flag: (initialData as any).flag || 0,
              tag: (initialData as any).tag || 'issue',
              value: initialData.value || '',
            },
          ],
        }),
        ...(initialData.type === 'TLSA' && {
          tlsa: [
            {
              usage: (initialData as any).usage || 3,
              selector: (initialData as any).selector || 1,
              matchingType: (initialData as any).matchingType || 1,
              certData: initialData.value || '',
            },
          ],
        }),
        ...(initialData.type === 'HTTPS' && {
          https: [
            {
              priority: (initialData as any).priority || 1,
              target: initialData.value || '',
              params: (initialData as any).params || {},
            },
          ],
        }),
        ...(initialData.type === 'SVCB' && {
          svcb: [
            {
              priority: (initialData as any).priority || 1,
              target: initialData.value || '',
              params: (initialData as any).params || {},
            },
          ],
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
