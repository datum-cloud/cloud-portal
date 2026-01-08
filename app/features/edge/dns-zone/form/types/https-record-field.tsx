import { Field } from '@/components/field/field';
import { HTTPSRecordSchema } from '@/resources/dns-records';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';

export const HTTPSRecordField = ({
  fields,
}: {
  fields: ReturnType<typeof useForm<HTTPSRecordSchema>>[1];
  defaultValue?: HTTPSRecordSchema;
}) => {
  const httpsFields = fields.https.getFieldset();

  if (!httpsFields) return null;

  return (
    <>
      <Field isRequired label="Priority" errors={httpsFields.priority.errors}>
        <Input
          {...getInputProps(httpsFields.priority, { type: 'number' })}
          key={httpsFields.priority.id}
          placeholder="1"
          min={0}
          max={65535}
        />
      </Field>

      <Field isRequired label="Target" errors={httpsFields.target.errors}>
        <Input
          {...getInputProps(httpsFields.target, { type: 'text' })}
          key={httpsFields.target.id}
          placeholder="e.g., example.com or ."
        />
      </Field>

      <Field label="Value" errors={httpsFields.params?.errors} className="col-span-2">
        <Input
          {...getInputProps(httpsFields.params, { type: 'text' })}
          key={httpsFields.params?.id}
          placeholder='e.g., alpn="h3,h2" ipv4hint="127.0.0.1" ipv6hint="::1"'
        />
      </Field>
    </>
  );
};
