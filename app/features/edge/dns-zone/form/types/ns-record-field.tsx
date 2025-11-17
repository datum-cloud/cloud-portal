import { Field } from '@/components/field/field';
import { NSRecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { useEffect } from 'react';

export const NSRecordField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<NSRecordSchema>>[1];
  defaultValue?: NSRecordSchema;
}) => {
  const nsFields = fields.ns.getFieldset();
  const contentControl = useInputControl(nsFields.content);

  useEffect(() => {
    if (defaultValue?.ns?.content && !nsFields.content.value) {
      contentControl.change(defaultValue.ns.content);
    }
  }, [defaultValue, contentControl, nsFields.content.value]);

  return (
    <Field
      isRequired
      label="Nameserver"
      errors={nsFields.content.errors}
      tooltipInfo="The authoritative nameserver for this domain.">
      <Input
        {...getInputProps(nsFields.content, { type: 'text' })}
        key={nsFields.content.id}
        placeholder="e.g., ns1.example.com"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          contentControl.change(e.target.value);
        }}
      />
    </Field>
  );
};
