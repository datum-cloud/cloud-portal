import { Field } from '@/components/field/field';
import useAutosizeTextArea from '@/hooks/useAutosizeTextArea';
import { SecretEnvSchema } from '@/resources/schemas/secret.schema';
import { getInputProps, getTextareaProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { Textarea } from '@shadcn/ui/textarea';
import { useEffect, useRef } from 'react';

export const KeyField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<SecretEnvSchema>>[1];
  defaultValue?: SecretEnvSchema;
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const keyControl = useInputControl(fields.key);
  const valueControl = useInputControl(fields.value);

  useAutosizeTextArea(textAreaRef.current, fields.value.value ?? '', {
    maxHeight: '200px',
  });

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.key && !fields.key.value) {
        keyControl.change(defaultValue?.key);
      }

      if (defaultValue.value && !fields.value.value) {
        valueControl.change(defaultValue?.value);
      }
    }
  }, [defaultValue, keyControl, fields.key.value, valueControl, fields.value.value]);

  return (
    <div className="relative flex flex-1 flex-col items-start gap-4 overflow-x-hidden p-1">
      <div className="flex w-full gap-4">
        <Field isRequired label="Key" errors={fields.key.errors} className="w-1/3">
          <Input
            {...getInputProps(fields.key, { type: 'text' })}
            key={fields.key.id}
            placeholder="e.g. username"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value;
              keyControl.change(value);
            }}
          />
        </Field>
        <Field
          isRequired
          label="Value"
          errors={fields.value.errors}
          className="w-3/4 max-w-[460px]">
          <Textarea
            {...getTextareaProps(fields.value)}
            className="min-h-10 w-full"
            rows={1}
            key={fields.value.id}
            ref={textAreaRef}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              const value = (e.target as HTMLTextAreaElement).value;
              valueControl.change(value);
            }}
          />
        </Field>
      </div>
    </div>
  );
};
