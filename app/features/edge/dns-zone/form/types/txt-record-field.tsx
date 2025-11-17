import { Field } from '@/components/field/field';
import { TXTRecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { useEffect } from 'react';

export const TXTRecordField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<TXTRecordSchema>>[1];
  defaultValue?: TXTRecordSchema;
}) => {
  const txtFields = fields.txt.getFieldset();
  const contentControl = useInputControl(txtFields.content);

  useEffect(() => {
    if (defaultValue?.txt?.content && !txtFields.content.value) {
      contentControl.change(defaultValue.txt.content);
    }
  }, [defaultValue, contentControl, txtFields.content.value]);

  return (
    <Field
      isRequired
      label="Text Content"
      errors={txtFields.content.errors}
      className="w-full"
      tooltipInfo="Text content for verification, SPF, DKIM, etc. Maximum 255 characters.">
      <Input
        {...getInputProps(txtFields.content, { type: 'text' })}
        key={txtFields.content.id}
        placeholder='e.g., v=spf1 include:_spf.example.com ~all'
        maxLength={255}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          contentControl.change(e.target.value);
        }}
      />
    </Field>
  );
};
