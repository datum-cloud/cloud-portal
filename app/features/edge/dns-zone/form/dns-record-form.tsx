import {
  ARecordField,
  AAAARecordField,
  ALIASRecordField,
  CAARecordField,
  CNAMERecordField,
  HTTPSRecordField,
  MXRecordField,
  NSRecordField,
  PTRRecordField,
  SOARecordField,
  SRVRecordField,
  SVCBRecordField,
  TLSARecordField,
  TXTRecordField,
} from './types';
import { SelectBox } from '@/components/select-box/select-box';
import {
  CreateDnsRecordSchema,
  createDnsRecordSchema,
  DNSRecordType,
  TTL_OPTIONS,
  useCreateDnsRecord,
  useUpdateDnsRecord,
} from '@/resources/dns-records';
import { formatDnsError, getDnsRecordTypeSelectOptions } from '@/utils/helpers/dns-record.helper';
import { type FieldMetadata } from '@conform-to/react';
import { Button, toast } from '@datum-ui/components';
import { LoaderOverlay } from '@datum-ui/components/loader-overlay';
import { Form } from '@datum-ui/components/new-form';
import { cn } from '@shadcn/lib/utils';
import { Form as RouterForm } from 'react-router';

interface DnsRecordFormProps {
  style?: 'inline' | 'modal';
  mode: 'create' | 'edit';
  defaultValue?: CreateDnsRecordSchema;
  projectId: string;
  dnsZoneId: string;
  dnsZoneName?: string;
  recordSetName?: string;
  recordName?: string;
  oldValue?: string; // The original value being edited (for updating specific values in arrays)
  oldTTL?: number | null; // The original TTL (for identifying which record to update)
  onClose: () => void;
  onSuccess?: () => void;
  isPending?: boolean;
  testMode?: boolean; // Enable test mode: disables type selector and hides submit button
}

export function DnsRecordForm({
  style = 'inline',
  mode,
  defaultValue,
  projectId,
  dnsZoneId,
  dnsZoneName,
  recordSetName,
  recordName,
  oldValue,
  oldTTL,
  onClose,
  onSuccess,
  isPending = false,
  testMode = false,
}: DnsRecordFormProps) {
  const createMutation = useCreateDnsRecord(projectId, dnsZoneId);
  const updateMutation = useUpdateDnsRecord(projectId, dnsZoneId, recordSetName ?? '');

  // Initialize form with default values based on record type
  const getInitialValues = (): Partial<CreateDnsRecordSchema> => {
    if (defaultValue) return defaultValue;

    return {
      recordType: 'A',
      name: '',
      ttl: null, // Auto by default
      a: { content: '' },
      // Initialize all complex types with single object (not arrays)
      mx: { exchange: '', preference: 10 },
      srv: { target: '', port: 443, priority: 10, weight: 5 },
      caa: { flag: 0, tag: 'issue', value: '' },
      tlsa: { usage: 3, selector: 1, matchingType: 1, certData: '' },
      https: { priority: 1, target: '', params: {} },
      svcb: { priority: 1, target: '', params: {} },
      dnsZoneRef: dnsZoneName ? { name: dnsZoneName } : undefined,
    } as Partial<CreateDnsRecordSchema>;
  };

  const handleSubmit = async (data: CreateDnsRecordSchema) => {
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(data);
      } else {
        await updateMutation.mutateAsync({
          ...data,
          recordName,
          oldValue,
          oldTTL,
        });
      }
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('DNS Record', {
        description: formatDnsError(message) || `Failed to ${mode} DNS record`,
      });
    }
  };

  const loading = isPending || createMutation.isPending || updateMutation.isPending;

  return (
    <Form.Root
      id={testMode ? `dns-record-form-${defaultValue?.recordType || 'A'}` : 'dns-record-form'}
      schema={createDnsRecordSchema}
      defaultValues={getInitialValues()}
      onSubmit={handleSubmit}
      formComponent={RouterForm}
      isSubmitting={loading}
      className={cn('flex flex-row items-start gap-5 space-y-0', style === 'modal' && 'flex-col')}>
      {({ fields }) => (
        <>
          {loading && style === 'inline' && (
            <LoaderOverlay
              message={`${mode === 'create' ? 'Adding' : 'Saving'} DNS record...`}
              className="rounded-lg"
            />
          )}

          <div className={cn('grid flex-1 grid-cols-4 gap-5', style === 'modal' && 'grid-cols-2')}>
            {/* Record Type */}
            <Form.Field name="recordType" label="Type" required>
              {({ control, meta }) => (
                <SelectBox
                  searchable
                  name={meta.name}
                  id={meta.id}
                  value={(control.value as string) ?? 'A'}
                  onChange={(value) => control.change(value.value)}
                  options={getDnsRecordTypeSelectOptions()}
                  disabled={testMode}
                  itemPreview={(option) => <span>{option.label}</span>}
                />
              )}
            </Form.Field>

            {/* Name */}
            <Form.Field name="name" label="Name" required>
              <Form.Input placeholder="e.g., www or @" disabled={loading} />
            </Form.Field>

            {/* TTL */}
            <Form.Field
              name="ttl"
              label="TTL"
              description="The amount of time DNS servers will wait before refreshing the record">
              {({ control, meta }) => (
                <SelectBox
                  searchable
                  name={meta.name}
                  id={meta.id}
                  value={control.value == null ? 'auto' : String(control.value)}
                  onChange={(value) =>
                    control.change(value.value === 'auto' ? '' : String(value.value))
                  }
                  options={TTL_OPTIONS.map((option) => ({
                    value: option.value === null ? 'auto' : String(option.value),
                    label: option.label,
                  }))}
                />
              )}
            </Form.Field>

            {/* Type-Specific Fields */}
            <RecordTypeFields recordTypeField={fields.recordType} />
          </div>

          {/* Form Actions - Hidden in test mode */}
          {!testMode && (
            <div
              className={cn(
                'flex items-center justify-start pt-6',
                style === 'modal' && 'w-full justify-end gap-2 pt-0'
              )}>
              {style === 'modal' && (
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="borderless"
                  onClick={onClose}
                  disabled={loading}>
                  Cancel
                </Button>
              )}
              <Button
                htmlType="submit"
                disabled={loading}
                loading={loading && style === 'modal'}
                className="h-10"
                type="secondary">
                {loading && style === 'modal'
                  ? mode === 'create'
                    ? 'Adding'
                    : 'Saving'
                  : mode === 'create'
                    ? 'Add'
                    : 'Save'}
              </Button>
            </div>
          )}
        </>
      )}
    </Form.Root>
  );
}

/** Renders the appropriate type-specific fields based on the current recordType value */
function RecordTypeFields({ recordTypeField }: { recordTypeField: FieldMetadata }) {
  const recordType = (recordTypeField.value || 'A') as DNSRecordType;

  switch (recordType) {
    case 'A':
      return <ARecordField />;
    case 'AAAA':
      return <AAAARecordField />;
    case 'CNAME':
      return <CNAMERecordField />;
    case 'ALIAS':
      return <ALIASRecordField />;
    case 'TXT':
      return <TXTRecordField />;
    case 'MX':
      return <MXRecordField />;
    case 'SRV':
      return <SRVRecordField />;
    case 'CAA':
      return <CAARecordField />;
    case 'NS':
      return <NSRecordField />;
    case 'SOA':
      return <SOARecordField />;
    case 'PTR':
      return <PTRRecordField />;
    case 'TLSA':
      return <TLSARecordField />;
    case 'HTTPS':
      return <HTTPSRecordField />;
    case 'SVCB':
      return <SVCBRecordField />;
    default:
      return null;
  }
}
