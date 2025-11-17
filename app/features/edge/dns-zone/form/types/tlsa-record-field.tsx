import { Field } from '@/components/field/field';
import { TLSARecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { Textarea } from '@shadcn/ui/textarea';

export const TLSARecordField = ({
  fields,
}: {
  fields: ReturnType<typeof useForm<TLSARecordSchema>>[1];
  defaultValue?: TLSARecordSchema;
}) => {
  // Always use the first (and only) item in the array
  const tlsaList = fields.tlsa.getFieldList();
  const tlsaFields = tlsaList[0]?.getFieldset();

  if (!tlsaFields) return null;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex gap-2">
        <Field
          isRequired
          label="Usage"
          errors={tlsaFields.usage.errors}
          className="flex-1"
          tooltipInfo="0-3: How the certificate is used">
          <Input
            {...getInputProps(tlsaFields.usage, { type: 'number' })}
            key={tlsaFields.usage.id}
            placeholder="3"
            min={0}
            max={3}
          />
        </Field>

        <Field
          isRequired
          label="Selector"
          errors={tlsaFields.selector.errors}
          className="flex-1"
          tooltipInfo="0: Full cert, 1: Public key only">
          <Input
            {...getInputProps(tlsaFields.selector, { type: 'number' })}
            key={tlsaFields.selector.id}
            placeholder="1"
            min={0}
            max={1}
          />
        </Field>

        <Field
          isRequired
          label="Matching Type"
          errors={tlsaFields.matchingType.errors}
          className="flex-1"
          tooltipInfo="0: Full, 1: SHA-256, 2: SHA-512">
          <Input
            {...getInputProps(tlsaFields.matchingType, { type: 'number' })}
            key={tlsaFields.matchingType.id}
            placeholder="1"
            min={0}
            max={2}
          />
        </Field>
      </div>

      <Field
        isRequired
        label="Certificate Data (Hex)"
        errors={tlsaFields.certData.errors}
        className="w-full"
        tooltipInfo="Hexadecimal encoded certificate or public key hash">
        <Textarea
          {...getInputProps(tlsaFields.certData, { type: 'text' })}
          key={tlsaFields.certData.id}
          placeholder="e.g., 0EED2700D3F228FDB..."
          className="font-mono text-xs"
          rows={3}
        />
      </Field>
    </div>
  );
};
