import { Field } from '@/components/field/field';
import { InputName } from '@/components/input-name/input-name';
import { SECRET_TYPES } from '@/features/secret/constants';
import { SecretBaseSchema } from '@/resources/schemas/secret.schema';
import { getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';
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
  const typeControl = useInputControl(fields.type);

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.name && fields.name.value === '') {
        nameControl.change(defaultValue.name);
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
        <InputName
          required
          description="This unique resource name will be used to identify your secret and cannot be changed."
          readOnly={isEdit}
          field={fields.name}
          autoGenerate={false}
          inputRef={isEdit ? undefined : inputRef}
          className="w-1/2"
        />
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
    </div>
  );
};
