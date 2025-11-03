import { Field } from '@/components/field/field';
import { STORAGE_TYPES } from '@/features/workload/constants';
import { StorageType } from '@/resources/interfaces/workload.interface';
import { StorageFieldSchema } from '@/resources/schemas/workload.schema';
import { getInputProps, getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';
import { useEffect, useRef } from 'react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const StorageField = ({
  isEdit = false,
  fields,
  defaultValue,
}: {
  isEdit?: boolean;
  fields: ReturnType<typeof useForm<StorageFieldSchema>>[1];
  defaultValue?: StorageFieldSchema;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();

  const typeControl = useInputControl(fields.type);
  const nameControl = useInputControl(fields.name);

  useEffect(() => {
    if (defaultValue) {
      // Only set values if they exist in defaultValue and current fields are empty
      if (defaultValue.name && fields.name.value === '') {
        nameControl.change(defaultValue?.name);
      }

      if (defaultValue.type && !fields.type.value) {
        typeControl.change(defaultValue?.type);
      }
    }
  }, [defaultValue, typeControl, nameControl, fields.name.value, fields.type.value]);

  // Focus the input when the form is hydrated
  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <Field isRequired label="Name" errors={fields.name.errors} className="w-full">
        <Input
          {...getInputProps(fields.name, { type: 'text' })}
          ref={isEdit ? undefined : inputRef}
          key={fields.name.id}
          placeholder="e.g. my-storage-us-3sd122"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value;
            nameControl.change(value);
          }}
        />
      </Field>
      <div className="flex w-full gap-4">
        <Field isRequired label="Type" errors={fields.type.errors} className="w-1/2">
          <Select
            {...getSelectProps(fields.type)}
            key={fields.type.id}
            value={typeControl.value}
            defaultValue={defaultValue?.type}
            onValueChange={typeControl.change}>
            <SelectTrigger disabled>
              <SelectValue placeholder="Select a storage type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(STORAGE_TYPES).map((storageType) => (
                <SelectItem key={storageType} value={storageType}>
                  {STORAGE_TYPES[storageType as keyof typeof STORAGE_TYPES].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {fields.type.value === StorageType.FILESYSTEM && (
          <Field
            isRequired
            label="Size"
            errors={fields.size.errors}
            className="w-1/2"
            description="Enter the size of the storage in Gi (Gibibyte)">
            <Input
              {...getInputProps(fields.size, {
                type: 'number',
                min: 10,
                max: 100,
              })}
              min={10}
              max={100}
              key={fields.size.id}
              placeholder="e.g. 10"
            />
          </Field>
        )}
      </div>
    </div>
  );
};
