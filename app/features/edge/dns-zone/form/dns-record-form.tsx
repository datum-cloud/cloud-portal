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
import {
  CreateDnsRecordSchema,
  createDnsRecordSchema,
  DNS_RECORD_TYPES,
  DNSRecordType,
  TTL_OPTIONS,
} from '@/resources/schemas/dns-record.schema';
import {
  FormProvider,
  getFormProps,
  getInputProps,
  useForm,
  useInputControl,
} from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import { Input } from '@shadcn/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Form, useSubmit } from 'react-router';

interface DnsRecordFormProps {
  mode: 'create' | 'edit';
  defaultValue?: CreateDnsRecordSchema;
  dnsZoneName?: string;
  onClose: () => void;
  onSuccess?: () => void;
  isPending?: boolean;
}

const DNS_RECORD_TYPE_OPTIONS = DNS_RECORD_TYPES.map((type) => ({
  value: type,
  label: type,
}));

export function DnsRecordForm({
  mode,
  defaultValue,
  dnsZoneName,
  onClose,
  onSuccess,
  isPending = false,
}: DnsRecordFormProps) {
  const submit = useSubmit();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values based on record type
  const getInitialValues = (): Partial<CreateDnsRecordSchema> => {
    if (defaultValue) return defaultValue;

    return {
      recordType: 'A',
      name: '',
      ttl: null, // Auto by default
      a: { content: '' },
      // Initialize all array types with single empty item
      mx: [{ exchange: '', preference: 10 }],
      srv: [{ target: '', port: 443, priority: 10, weight: 5 }],
      caa: [{ flag: 0, tag: 'issue', value: '' }],
      tlsa: [{ usage: 3, selector: 1, matchingType: 1, certData: '' }],
      https: [{ priority: 1, target: '' }],
      svcb: [{ priority: 1, target: '' }],
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
    onSubmit(event, { submission }) {
      event.preventDefault();
      event.stopPropagation();

      if (submission?.status === 'success') {
        setIsSubmitting(true);

        // TODO: Replace with actual API call
        setTimeout(() => {
          console.log(
            `${mode === 'create' ? 'Creating' : 'Updating'} DNS record:`,
            submission.value
          );
          setIsSubmitting(false);
          onSuccess?.();
          onClose();
        }, 1000);

        // For React Router integration:
        // const formElement = event.currentTarget as HTMLFormElement;
        // submit(submission.value, {
        //   method: 'POST',
        //   action: formElement.getAttribute('action') || undefined,
        //   encType: 'application/json',
        //   replace: true,
        // });
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
      <Form {...getFormProps(form)} method="POST" className="flex flex-col gap-4">
        {loading && (
          <div className="bg-background/20 absolute inset-0 z-10 flex items-center justify-center gap-2 backdrop-blur-xs">
            <Loader2 className="size-4 animate-spin" />
            {mode === 'create' ? 'Creating' : 'Updating'} DNS record...
          </div>
        )}

        <div className="flex gap-3">
          {/* Record Type */}
          <Field
            isRequired
            label="Type"
            errors={fields.recordType.errors}
            className="w-32"
            tooltipInfo="DNS record type">
            <Select
              key={fields.recordType.id}
              name={fields.recordType.name}
              value={recordTypeControl.value}
              disabled={mode === 'edit' || loading}
              onValueChange={recordTypeControl.change}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {DNS_RECORD_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Name */}
          <Field
            isRequired
            label="Name"
            errors={fields.name.errors}
            className="flex-1"
            tooltipInfo="Record name (use @ for root domain or subdomain name)">
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
            className="w-32"
            tooltipInfo="Time to live - Auto uses zone default">
            <Select
              key={fields.ttl.id}
              name={fields.ttl.name}
              value={ttlControl.value === null || ttlControl.value === undefined ? 'auto' : String(ttlControl.value)}
              disabled={loading}
              onValueChange={(value) => {
                ttlControl.change(value === 'auto' ? '' : value);
              }}>
              <SelectTrigger>
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent>
                {TTL_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value === null ? 'auto' : option.value}
                    value={option.value === null ? 'auto' : String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Type-Specific Fields */}
        <div className="rounded-md border p-4">
          <div className="mb-3 text-sm font-medium">{currentRecordType} Record Configuration</div>
          {renderTypeSpecificFields}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            htmlType="button"
            type="quaternary"
            theme="borderless"
            onClick={onClose}
            disabled={loading}>
            Cancel
          </Button>
          <Button htmlType="submit" disabled={loading} loading={loading}>
            {mode === 'create' ? 'Create Record' : 'Save Changes'}
          </Button>
        </div>
      </Form>
    </FormProvider>
  );
}
