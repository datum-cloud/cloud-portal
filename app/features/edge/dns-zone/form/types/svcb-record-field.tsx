import { Field } from '@/components/field/field';
import { SVCBRecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';

export const SVCBRecordField = ({
  fields,
}: {
  fields: ReturnType<typeof useForm<SVCBRecordSchema>>[1];
  defaultValue?: SVCBRecordSchema;
}) => {
  // Always use the first (and only) item in the array
  const svcbList = fields.svcb.getFieldList();
  const svcbFields = svcbList[0]?.getFieldset();

  if (!svcbFields) return null;

  return (
    <div className="flex gap-2">
      <Field
        isRequired
        label="Priority"
        errors={svcbFields.priority.errors}
        className="w-24"
        tooltipInfo="0 for alias mode, >0 for service mode">
        <Input
          {...getInputProps(svcbFields.priority, { type: 'number' })}
          key={svcbFields.priority.id}
          placeholder="1"
          min={0}
          max={65535}
        />
      </Field>

      <Field
        isRequired
        label="Target"
        errors={svcbFields.target.errors}
        className="flex-1"
        tooltipInfo="Target hostname or . for alias mode">
        <Input
          {...getInputProps(svcbFields.target, { type: 'text' })}
          key={svcbFields.target.id}
          placeholder="e.g., example.com or ."
        />
      </Field>
    </div>
  );
};
