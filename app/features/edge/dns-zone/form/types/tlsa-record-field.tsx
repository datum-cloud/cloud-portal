import { Field } from '@/components/field/field';
import { TLSARecordSchema } from '@/resources/dns-records';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { Textarea } from '@shadcn/ui/textarea';

export const TLSARecordField = ({
  fields,
}: {
  fields: ReturnType<typeof useForm<TLSARecordSchema>>[1];
  defaultValue?: TLSARecordSchema;
}) => {
  const tlsaFields = fields.tlsa.getFieldset();

  return (
    <>
      <Field isRequired label="Usage" errors={tlsaFields.usage.errors}>
        <Input
          {...getInputProps(tlsaFields.usage, { type: 'number' })}
          key={tlsaFields.usage.id}
          placeholder="3"
          min={0}
          max={3}
        />
      </Field>

      <Field isRequired label="Selector" errors={tlsaFields.selector.errors}>
        <Input
          {...getInputProps(tlsaFields.selector, { type: 'number' })}
          key={tlsaFields.selector.id}
          placeholder="1"
          min={0}
          max={1}
        />
      </Field>

      <Field isRequired label="Matching Type" errors={tlsaFields.matchingType.errors}>
        <Input
          {...getInputProps(tlsaFields.matchingType, { type: 'number' })}
          key={tlsaFields.matchingType.id}
          placeholder="1"
          min={0}
          max={2}
        />
      </Field>

      <Field
        isRequired
        label="Certificate Data (Hex)"
        errors={tlsaFields.certData.errors}
        className="col-span-4">
        <Textarea
          {...getInputProps(tlsaFields.certData, { type: 'text' })}
          key={tlsaFields.certData.id}
          placeholder="e.g., 0EED2700D3F228FDB..."
          className="font-mono text-xs"
          rows={3}
        />
      </Field>
    </>
  );
};
