import { Field } from '@/components/field/field';
import { ARecordSchema } from '@/resources/dns-records';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { useEffect } from 'react';

export const ARecordField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<ARecordSchema>>[1];
  defaultValue?: ARecordSchema;
}) => {
  const aFields = fields.a.getFieldset();
  const contentControl = useInputControl(aFields.content);

  useEffect(() => {
    if (defaultValue?.a?.content && !aFields.content.value) {
      contentControl.change(defaultValue.a.content);
    }
  }, [defaultValue, contentControl, aFields.content.value]);

  return (
    <Field isRequired label="IPv4 Address" errors={aFields.content.errors}>
      <Input
        {...getInputProps(aFields.content, { type: 'text' })}
        key={aFields.content.id}
        placeholder="e.g., 192.168.1.1"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          contentControl.change(e.target.value);
        }}
      />
    </Field>
  );
};
