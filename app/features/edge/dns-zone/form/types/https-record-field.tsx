import { Field } from '@/components/field/field';
import { HTTPSRecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';

export const HTTPSRecordField = ({
  fields,
}: {
  fields: ReturnType<typeof useForm<HTTPSRecordSchema>>[1];
  defaultValue?: HTTPSRecordSchema;
}) => {
  // Always use the first (and only) item in the array
  const httpsList = fields.https.getFieldList();
  const httpsFields = httpsList[0]?.getFieldset();

  if (!httpsFields) return null;

  return (
    <div className="flex gap-2">
      <Field
        isRequired
        label="Priority"
        errors={httpsFields.priority.errors}
        className="w-24"
        tooltipInfo="0 for alias mode, >0 for service mode">
        <Input
          {...getInputProps(httpsFields.priority, { type: 'number' })}
          key={httpsFields.priority.id}
          placeholder="1"
          min={0}
          max={65535}
        />
      </Field>

      <Field
        isRequired
        label="Target"
        errors={httpsFields.target.errors}
        className="flex-1"
        tooltipInfo="Target hostname or . for alias mode">
        <Input
          {...getInputProps(httpsFields.target, { type: 'text' })}
          key={httpsFields.target.id}
          placeholder="e.g., example.com or ."
        />
      </Field>
    </div>
  );
};
