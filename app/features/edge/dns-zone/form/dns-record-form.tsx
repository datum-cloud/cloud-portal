import { ARecordField } from './types/a-record-field';
import { AAAARecordField } from './types/aaaa-record-field';
import { CAARecordField } from './types/caa-record-field';
import { CNAMERecordField } from './types/cname-record-field';
import { HTTPSRecordField } from './types/https-record-field';
import { MXRecordField } from './types/mx-record-field';
import { NSRecordField } from './types/ns-record-field';
import { PTRRecordField } from './types/ptr-record-field';
import { SOARecordField } from './types/soa-record-field';
import { SRVRecordField } from './types/srv-record-field';
import { SVCBRecordField } from './types/svcb-record-field';
import { TLSARecordField } from './types/tlsa-record-field';
import { TXTRecordField } from './types/txt-record-field';
import { Field } from '@/components/field/field';
import { LoaderOverlay } from '@/components/loader-overlay/loader-overlay';
import { SelectBox } from '@/components/select-box/select-box';
import {
  CreateDnsRecordSchema,
  createDnsRecordSchema,
  DNS_RECORD_TYPES,
  DNSRecordType,
  TTL_OPTIONS,
} from '@/resources/schemas/dns-record.schema';
import { ROUTE_PATH as DNS_RECORDS_ACTIONS_PATH } from '@/routes/api/dns-records';
import { ROUTE_PATH as DNS_RECORDS_DETAIL_PATH } from '@/routes/api/dns-records/$id';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  FormProvider,
  getFormProps,
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button, toast } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Input } from '@shadcn/ui/input';
import { useMemo, useState } from 'react';
import { Form } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

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
}: DnsRecordFormProps) {
  const csrf = useAuthenticityToken();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const [form, fields] = useForm<CreateDnsRecordSchema>({
    id: 'dns-record-form',
    constraint: getZodConstraint(createDnsRecordSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    defaultValue: getInitialValues(),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: createDnsRecordSchema });
    },
    async onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      if (submission?.status === 'success') {
        setIsSubmitting(true);

        try {
          const apiUrl =
            mode === 'create'
              ? DNS_RECORDS_ACTIONS_PATH
              : getPathWithParams(DNS_RECORDS_DETAIL_PATH, { id: recordSetName });

          const payload = {
            csrf,
            projectId,
            dnsZoneId,
            ...(mode === 'edit' && { recordName }),
            ...(mode === 'edit' && oldValue && { oldValue }), // Include oldValue for edit mode
            ...(mode === 'edit' && oldTTL !== undefined && { oldTTL }), // Include oldTTL for edit mode
            ...submission.value,
          };

          const response = await fetch(apiUrl, {
            method: mode === 'create' ? 'POST' : 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || `Failed to ${mode} DNS record`);
          }

          if (result.success) {
            onSuccess?.();
            onClose();
          } else {
            throw new Error(result?.error || `Failed to ${mode} DNS record`);
          }
        } catch (error: any) {
          toast.error(error.message || `Failed to ${mode} DNS record. Please try again.`);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
  });

  const recordTypeControl = useInputControl(fields.recordType);
  const nameControl = useInputControl(fields.name);
  const ttlControl = useInputControl(fields.ttl);

  const currentRecordType = (recordTypeControl.value || 'A') as DNSRecordType;

  // Render the appropriate field component based on record type
  const renderTypeSpecificFields = useMemo(() => {
    const typeFieldMap: Record<DNSRecordType, React.ReactNode> = {
      A: <ARecordField fields={fields as any} defaultValue={defaultValue as any} />,
      AAAA: <AAAARecordField fields={fields as any} defaultValue={defaultValue as any} />,
      CNAME: <CNAMERecordField fields={fields as any} defaultValue={defaultValue as any} />,
      TXT: <TXTRecordField fields={fields as any} defaultValue={defaultValue as any} />,
      MX: <MXRecordField fields={fields as any} defaultValue={defaultValue as any} />,
      SRV: <SRVRecordField fields={fields as any} defaultValue={defaultValue as any} />,
      CAA: <CAARecordField fields={fields as any} defaultValue={defaultValue as any} />,
      NS: <NSRecordField fields={fields as any} defaultValue={defaultValue as any} />,
      SOA: <SOARecordField fields={fields as any} defaultValue={defaultValue as any} />,
      PTR: <PTRRecordField fields={fields as any} defaultValue={defaultValue as any} />,
      TLSA: <TLSARecordField fields={fields as any} defaultValue={defaultValue as any} />,
      HTTPS: <HTTPSRecordField fields={fields as any} defaultValue={defaultValue as any} />,
      SVCB: <SVCBRecordField fields={fields as any} defaultValue={defaultValue as any} />,
    };

    return typeFieldMap[currentRecordType];
  }, [currentRecordType, fields, defaultValue]);

  const loading = isPending || isSubmitting;

  return (
    <FormProvider context={form.context}>
      <Form
        {...getFormProps(form)}
        method="POST"
        className={cn('flex flex-row items-start gap-5', style === 'modal' && 'flex-col')}>
        {loading && style === 'inline' && (
          <LoaderOverlay
            message={`${mode === 'create' ? 'Adding' : 'Saving'} DNS record...`}
            className="rounded-lg"
          />
        )}

        <div className={cn('grid flex-1 grid-cols-4 gap-5', style === 'modal' && 'grid-cols-2')}>
          {/* Record Type */}
          <Field isRequired label="Type" errors={fields.recordType.errors}>
            <SelectBox
              {...getSelectProps(fields.recordType, { value: false })}
              searchable
              name={fields.recordType.name}
              id={fields.recordType.id}
              key={fields.recordType.id}
              value={recordTypeControl.value}
              onChange={(value) => {
                recordTypeControl.change(value.value);
              }}
              options={Object.values(DNS_RECORD_TYPES).map((kind) => ({
                value: kind,
                label: kind,
              }))}
            />
          </Field>

          {/* Name */}
          <Field isRequired label="Name" errors={fields.name.errors}>
            <Input
              {...getInputProps(fields.name, { type: 'text' })}
              key={fields.name.id}
              placeholder="e.g., www or @"
              disabled={loading}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                nameControl.change(e.target.value);
              }}
            />
          </Field>

          {/* TTL */}
          <Field
            label="TTL"
            errors={fields.ttl.errors}
            description="The amount of time DNS servers will wait before refreshing the record">
            <SelectBox
              {...getSelectProps(fields.ttl, { value: false })}
              searchable
              name={fields.ttl.name}
              id={fields.ttl.id}
              key={fields.ttl.id}
              value={
                ttlControl.value === null || ttlControl.value === undefined
                  ? 'auto'
                  : String(ttlControl.value)
              }
              onChange={(value) => {
                ttlControl.change(value.value === 'auto' ? '' : String(value.value));
              }}
              options={TTL_OPTIONS.map((option) => ({
                value: option.value === null ? 'auto' : String(option.value),
                label: option.label,
              }))}
            />
          </Field>

          {/* Type-Specific Fields */}
          {renderTypeSpecificFields}
        </div>

        {/* Form Actions */}
        <div
          className={cn(
            'flex items-center justify-start pt-5',
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
      </Form>
    </FormProvider>
  );
}
