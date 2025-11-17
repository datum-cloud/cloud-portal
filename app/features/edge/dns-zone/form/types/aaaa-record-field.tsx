import { Field } from '@/components/field/field';
import { AAAARecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { useEffect } from 'react';

export const AAAARecordField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<AAAARecordSchema>>[1];
  defaultValue?: AAAARecordSchema;
}) => {
  const aaaaFields = fields.aaaa.getFieldset();
  const contentControl = useInputControl(aaaaFields.content);

  useEffect(() => {
    if (defaultValue?.aaaa?.content && !aaaaFields.content.value) {
      contentControl.change(defaultValue.aaaa.content);
    }
  }, [defaultValue, contentControl, aaaaFields.content.value]);

  return (
    <Field isRequired label="IPv6 Address" errors={aaaaFields.content.errors}>
      <Input
        {...getInputProps(aaaaFields.content, { type: 'text' })}
        key={aaaaFields.content.id}
        placeholder="e.g., 2001:0db8:85a3:0000:0000:8a2e:0370:7334"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          contentControl.change(e.target.value);
        }}
      />
    </Field>
  );
};
