import { Field } from '@/components/field/field';
import { SRVRecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';

export const SRVRecordField = ({
  fields,
}: {
  fields: ReturnType<typeof useForm<SRVRecordSchema>>[1];
  defaultValue?: SRVRecordSchema;
}) => {
  // Always use the first (and only) item in the array
  const srvList = fields.srv.getFieldList();
  const srvFields = srvList[0]?.getFieldset();

  if (!srvFields) return null;

  return (
    <>
      <Field isRequired label="Target Server" errors={srvFields.target.errors}>
        <Input
          {...getInputProps(srvFields.target, { type: 'text' })}
          key={srvFields.target.id}
          placeholder="e.g., server.example.com"
        />
      </Field>

      <Field isRequired label="Priority" errors={srvFields.priority.errors}>
        <Input
          {...getInputProps(srvFields.priority, { type: 'number' })}
          key={srvFields.priority.id}
          placeholder="10"
          min={0}
          max={65535}
        />
      </Field>

      <Field isRequired label="Weight" errors={srvFields.weight.errors}>
        <Input
          {...getInputProps(srvFields.weight, { type: 'number' })}
          key={srvFields.weight.id}
          placeholder="5"
          min={0}
          max={65535}
        />
      </Field>

      <Field isRequired label="Port" errors={srvFields.port.errors}>
        <Input
          {...getInputProps(srvFields.port, { type: 'number' })}
          key={srvFields.port.id}
          placeholder="443"
          min={1}
          max={65535}
        />
      </Field>
    </>
  );
};
