import { Field } from '@/components/field/field';
import { MXRecordSchema } from '@/resources/dns-records';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';

export const MXRecordField = ({
  fields,
}: {
  fields: ReturnType<typeof useForm<MXRecordSchema>>[1];
  defaultValue?: MXRecordSchema;
}) => {
  const mxFields = fields.mx.getFieldset();

  return (
    <>
      <Field isRequired label="Mail Server" errors={mxFields.exchange.errors}>
        <Input
          {...getInputProps(mxFields.exchange, { type: 'text' })}
          key={mxFields.exchange.id}
          placeholder="e.g., mail.example.com"
        />
      </Field>

      <Field isRequired label="Priority" errors={mxFields.preference.errors}>
        <Input
          {...getInputProps(mxFields.preference, { type: 'number' })}
          key={mxFields.preference.id}
          placeholder="10"
          min={0}
          max={65535}
        />
      </Field>
    </>
  );
};
