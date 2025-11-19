import { DnsRecordForm } from '../../form/dns-record-form';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { CreateDnsRecordSchema } from '@/resources/schemas/dns-record.schema';
import { recordToFormDefaultValue } from '@/utils/helpers/dns-record.helper';

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
        ...recordToFormDefaultValue(initialData),
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
