import { Field } from '@/components/field/field';
import { MXRecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';

export const MXRecordField = ({
  fields,
}: {
  fields: ReturnType<typeof useForm<MXRecordSchema>>[1];
  defaultValue?: MXRecordSchema;
}) => {
  // Always use the first (and only) item in the array
  const mxList = fields.mx.getFieldList();
  const mxFields = mxList[0]?.getFieldset();

  if (!mxFields) return null;

  return (
    <div className="flex gap-2">
      <Field
        isRequired
        label="Mail Server"
        errors={mxFields.exchange.errors}
        className="flex-1">
        <Input
          {...getInputProps(mxFields.exchange, { type: 'text' })}
          key={mxFields.exchange.id}
          placeholder="e.g., mail.example.com"
        />
      </Field>

      <Field
        isRequired
        label="Priority"
        errors={mxFields.preference.errors}
        className="w-24">
        <Input
          {...getInputProps(mxFields.preference, { type: 'number' })}
          key={mxFields.preference.id}
          placeholder="10"
          min={0}
          max={65535}
        />
      </Field>
    </div>
  );
};
