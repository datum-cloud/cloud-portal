import { Field } from '@/components/field/field';
import { annotationFormSchema, AnnotationFormSchema } from '@/resources/schemas/metadata.schema';
import { getFormProps, getInputProps, useForm } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod/v4';
import { Button } from '@datum-ui/components';
import { Input } from '@shadcn/ui/input';
import { useEffect, useRef } from 'react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const AnnotationForm = ({
  defaultValue,
  onSubmit,
  onCancel,
}: {
  defaultValue?: AnnotationFormSchema;
  onSubmit: (annotation: AnnotationFormSchema) => void;
  onCancel: () => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();

  const [form, fields] = useForm({
    id: 'annotation-form',
    constraint: getZodConstraint(annotationFormSchema),
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: annotationFormSchema });
    },
    onSubmit(event, { formData }) {
      event.preventDefault();
      event.stopPropagation();
      const parsed = parseWithZod(formData, { schema: annotationFormSchema });
      if (parsed.status === 'success') {
        onSubmit?.(parsed.value);
      }
    },
  });

  // Focus the input when the form is hydrated
  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  useEffect(() => {
    if (defaultValue) {
      form.update({ value: defaultValue });
    }
  }, [defaultValue]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    form.onSubmit(event);
  };

  return (
    <form method="post" {...getFormProps(form)} onSubmit={handleSubmit}>
      <div className="space-y-4">
        <Field isRequired label="Key" errors={fields.key.errors}>
          <Input
            {...getInputProps(fields.key, { type: 'text' })}
            key={fields.key.id}
            placeholder="e.g. app"
            ref={inputRef}
          />
        </Field>
        <Field isRequired label="Value" errors={fields.value.errors}>
          <Input
            {...getInputProps(fields.value, { type: 'text' })}
            key={fields.value.id}
            placeholder="e.g. Nginx"
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-6">
        <Button
          type="quaternary"
          theme="borderless"
          onClick={() => {
            onCancel?.();
          }}>
          Cancel
        </Button>
        <Button htmlType="submit">Save</Button>
      </div>
    </form>
  );
};
