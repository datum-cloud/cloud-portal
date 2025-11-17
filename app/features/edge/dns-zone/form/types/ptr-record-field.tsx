import { Field } from '@/components/field/field';
import { PTRRecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { useEffect } from 'react';

export const PTRRecordField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<PTRRecordSchema>>[1];
  defaultValue?: PTRRecordSchema;
}) => {
  const ptrFields = fields.ptr.getFieldset();
  const contentControl = useInputControl(ptrFields.content);

  useEffect(() => {
    if (defaultValue?.ptr?.content && !ptrFields.content.value) {
      contentControl.change(defaultValue.ptr.content);
    }
  }, [defaultValue, contentControl, ptrFields.content.value]);

  return (
    <Field
      isRequired
      label="Target Domain"
      errors={ptrFields.content.errors}
      className="w-full"
      tooltipInfo="The domain name that this IP address points to (reverse DNS).">
      <Input
        {...getInputProps(ptrFields.content, { type: 'text' })}
        key={ptrFields.content.id}
        placeholder="e.g., host.example.com"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          contentControl.change(e.target.value);
        }}
      />
    </Field>
  );
};
