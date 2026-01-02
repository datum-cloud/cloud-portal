import { DnsRecordForm } from '../dns-zone/form/dns-record-form';
import type { DnsRecordInlineFormProps } from './types';
import { CreateDnsRecordSchema } from '@/resources/dns-records';
import { recordToFormDefaultValue } from '@/utils/helpers/dns-record.helper';

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
