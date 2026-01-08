import { Field } from '@/components/field/field';
import { SVCBRecordSchema } from '@/resources/dns-records';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';

export const SVCBRecordField = ({
  fields,
}: {
  fields: ReturnType<typeof useForm<SVCBRecordSchema>>[1];
  defaultValue?: SVCBRecordSchema;
}) => {
  const svcbFields = fields.svcb.getFieldset();

  if (!svcbFields) return null;

  return (
    <>
      <Field isRequired label="Priority" errors={svcbFields.priority.errors}>
        <Input
          {...getInputProps(svcbFields.priority, { type: 'number' })}
          key={svcbFields.priority.id}
          placeholder="1"
          min={0}
          max={65535}
        />
      </Field>

      <Field isRequired label="Target" errors={svcbFields.target.errors}>
        <Input
          {...getInputProps(svcbFields.target, { type: 'text' })}
          key={svcbFields.target.id}
          placeholder="e.g., example.com or ."
        />
      </Field>

      <Field label="Value" errors={svcbFields.params?.errors} className="col-span-2">
        <Input
          {...getInputProps(svcbFields.params, { type: 'text' })}
          key={svcbFields.params?.id}
          placeholder='E.g. alpn="h3,h2" ipv4hint="127.0.0.1" ipv6hint="::1"'
        />
      </Field>
    </>
  );
};
