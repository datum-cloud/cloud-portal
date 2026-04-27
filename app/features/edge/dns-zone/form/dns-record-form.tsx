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
import { usePreserveTouchedOnSubmit } from '@/components/form/use-preserve-touched-on-submit';
import {
  CreateDnsRecordSchema,
  createDnsRecordSchema,
  DNSRecordType,
  TTL_OPTIONS,
  useCreateDnsRecord,
  useUpdateDnsRecord,
} from '@/resources/dns-records';
import { formatDnsError, getDnsRecordTypeSelectOptions } from '@/utils/helpers/dns-record.helper';
import { Autocomplete } from '@datum-cloud/datum-ui/autocomplete';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form, useWatch } from '@datum-cloud/datum-ui/form';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Form as RouterForm } from 'react-router';

const TTL_AUTO_SENTINEL = 'auto';

// Names of every renderable field in the DNS record form (top-level + nested).
// Pinned to the touched set on each submit attempt so the package's
// `markAllFieldsTouched` (which empties the set for discriminated-union schemas)
// can't wipe these fields' error display.
const DNS_RECORD_FIELD_NAMES = [
  'recordType',
  'name',
  'ttl',
  'a.content',
  'aaaa.content',
  'alias.content',
  'caa.flag',
  'caa.tag',
  'caa.value',
  'cname.content',
  'https.priority',
  'https.target',
  'https.params',
  'mx.exchange',
  'mx.preference',
  'ns.content',
  'ptr.content',
  'soa.mname',
  'soa.rname',
  'soa.serial',
  'soa.refresh',
  'soa.retry',
  'soa.expire',
  'soa.ttl',
  'srv.target',
  'srv.priority',
  'srv.weight',
  'srv.port',
  'svcb.priority',
  'svcb.target',
  'svcb.params',
  'tlsa.usage',
  'tlsa.selector',
  'tlsa.matchingType',
  'tlsa.certData',
  'txt.content',
] as const;

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
      mode="onBlur"
      defaultValues={getInitialValues()}
      onSubmit={handleSubmit}
      formComponent={RouterForm}
      isSubmitting={loading}
      className={cn(
        'flex flex-row items-start gap-5 space-y-0',
        style === 'modal' && 'flex-col',
        // Reserve space on the right so the inline panel's close button
        // doesn't overlap the form's rightmost column.
        style === 'inline' && 'pr-8'
      )}>
      {() => (
        <>
          <PreserveAllFieldsTouched />
          {loading && style === 'inline' && (
            <LoaderOverlay
              message={`${mode === 'create' ? 'Adding' : 'Saving'} DNS record...`}
              className="rounded-lg"
            />
          )}

          <div
            className={cn(
              'grid flex-1 gap-5',
              style === 'inline' ? 'grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'
            )}>
            {/* Record Type */}
            <Form.Field name="recordType" label="Type" required>
              <Form.Combobox
                searchable
                options={getDnsRecordTypeSelectOptions()}
                disabled={testMode}
              />
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
                <Autocomplete
                  name={meta.name}
                  id={meta.id}
                  value={control.value == null ? TTL_AUTO_SENTINEL : String(control.value)}
                  onValueChange={(value) =>
                    control.change(value === TTL_AUTO_SENTINEL ? '' : String(value))
                  }
                  options={TTL_OPTIONS.map((option) => ({
                    value: option.value === null ? TTL_AUTO_SENTINEL : String(option.value),
                    label: option.label,
                  }))}
                />
              )}
            </Form.Field>

            {/* Type-Specific Fields */}
            <RecordTypeFields />
          </div>

          {/* Form Actions - Hidden in test mode */}
          {!testMode && (
            <div
              className={
                style === 'inline'
                  ? 'flex items-center justify-start pt-6'
                  : 'flex w-full flex-col-reverse items-center gap-2 sm:flex-row sm:justify-end'
              }>
              {style === 'modal' && (
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="borderless"
                  className="w-full sm:w-auto"
                  onClick={onClose}
                  disabled={loading}>
                  Cancel
                </Button>
              )}
              <Button
                htmlType="submit"
                disabled={loading}
                loading={loading && style === 'modal'}
                className={cn('h-10', style === 'modal' && 'w-full sm:w-auto')}
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

/**
 * Re-pins every DNS record field name to the form's touched set on each
 * submit attempt. Workaround for `markAllFieldsTouched` reset on the
 * discriminated-union schema. Renders nothing.
 */
function PreserveAllFieldsTouched() {
  usePreserveTouchedOnSubmit(DNS_RECORD_FIELD_NAMES);
  return null;
}

/** Renders the appropriate type-specific fields based on the current recordType value */
function RecordTypeFields() {
  const recordTypeValue = useWatch('recordType');
  const recordType = (recordTypeValue || 'A') as DNSRecordType;

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
