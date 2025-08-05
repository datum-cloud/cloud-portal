import { Field } from '@/components/field/field';
import { SelectAnnotations } from '@/components/select-annotations/select-annotations';
import { SelectLabels } from '@/components/select-labels/select-labels';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SECRET_TYPES } from '@/features/secret/constants';
import { SecretBaseSchema } from '@/resources/schemas/secret.schema';
import { getInputProps, getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { useEffect, useRef } from 'react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const SecretMetadataForm = ({
  fields,
  defaultValue,
  isEdit = false,
}: {
  fields: ReturnType<typeof useForm<SecretBaseSchema>>[1];
  defaultValue?: SecretBaseSchema;
  isEdit?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();

  const nameControl = useInputControl(fields.name);
  const labelsControl = useInputControl(fields.labels);
  const annotationsControl = useInputControl(fields.annotations);
  const typeControl = useInputControl(fields.type);

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.name && fields.name.value === '') {
        nameControl.change(defaultValue.name);
      }
      if (defaultValue.labels && !fields.labels.value) {
        labelsControl.change(defaultValue.labels);
      }
      if (defaultValue.annotations && !fields.annotations.value) {
        annotationsControl.change(defaultValue.annotations);
      }
      if (defaultValue.type && !fields.type.value) {
        typeControl.change(defaultValue.type);
      }
    }
  }, [defaultValue]);

  // Focus the input when the form is hydrated
  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <Field
          className="w-1/2"
          isRequired
          label="Name"
          description="A namespace-unique stable identifier for your secret. This cannot be changed once the secret is created"
          errors={fields.name.errors}>
          <Input
            {...getInputProps(fields.name, { type: 'text' })}
            readOnly={isEdit}
            key={fields.name.id}
            ref={isEdit ? undefined : inputRef}
            placeholder="e.g. my-secret-3sd122"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value;
              nameControl.change(value);
            }}
          />
        </Field>
        <Field isRequired label="Type" errors={fields.type.errors} className="w-1/2">
          <Select
            {...getSelectProps(fields.type)}
            key={fields.type.id}
            value={fields.type.value}
            defaultValue={fields.type.value}
            onValueChange={typeControl.change}>
            <SelectTrigger autoFocus disabled={isEdit}>
              <SelectValue placeholder="Select a Type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(SECRET_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {SECRET_TYPES[type as keyof typeof SECRET_TYPES].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex items-start gap-4">
        <Field
          className="w-1/2"
          label="Labels"
          errors={fields.labels.errors}
          description="Add labels to help identify, organize, and filter your secrets.">
          <SelectLabels
            defaultValue={fields.labels.value as string[]}
            onChange={(value) => {
              labelsControl.change(value);
            }}
          />
        </Field>
        <Field
          className="w-1/2"
          label="Annotations"
          errors={fields.annotations.errors}
          description="Add annotations to help identify, organize, and filter your secrets.">
          <SelectAnnotations
            defaultValue={fields.annotations.value as string[]}
            onChange={(value) => {
              annotationsControl.change(value);
            }}
          />
        </Field>
      </div>
    </div>
  );
};
