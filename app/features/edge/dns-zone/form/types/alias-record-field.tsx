import { Field } from '@/components/field/field';
import { ALIASRecordSchema } from '@/resources/dns-records';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { useEffect } from 'react';

export const ALIASRecordField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<ALIASRecordSchema>>[1];
  defaultValue?: ALIASRecordSchema;
}) => {
  const aliasFields = (fields as any).alias.getFieldset();
  const contentControl = useInputControl(aliasFields.content);

  useEffect(() => {
    if ((defaultValue as any)?.alias?.content && !aliasFields.content.value) {
      contentControl.change((defaultValue as any).alias.content);
    }
  }, [defaultValue, contentControl, aliasFields.content.value]);

  return (
    <Field isRequired label="Target Domain" errors={aliasFields.content.errors}>
      <Input
        {...getInputProps(aliasFields.content, { type: 'text' })}
        key={aliasFields.content.id}
        placeholder="e.g., example.com"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          contentControl.change(e.target.value);
        }}
      />
    </Field>
  );
};
