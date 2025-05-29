import { EnvsForm } from './envs-form';
import { PortsForm } from './ports-form';
import { Field } from '@/components/field/field';
import { FieldLabel } from '@/components/field/field-label';
import { Input } from '@/components/ui/input';
import {
  RuntimeContainerSchema,
  RuntimeEnvSchema,
  RuntimePortSchema,
} from '@/resources/schemas/workload.schema';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { useEffect, useRef } from 'react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const ContainerField = ({
  isEdit,
  defaultValue,
  projectId,
  fields,
}: {
  isEdit: boolean;
  defaultValue?: RuntimeContainerSchema;
  projectId?: string;
  fields: ReturnType<typeof useForm<RuntimeContainerSchema>>[1];
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();

  const imageControl = useInputControl(fields.image);
  const nameControl = useInputControl(fields.name);

  useEffect(() => {
    if (defaultValue) {
      // Only set values if they exist in defaultValue and current fields are empty
      if (defaultValue.name && fields.name.value === '') {
        nameControl.change(defaultValue?.name);
      }

      if (defaultValue.image && fields.image.value === '') {
        imageControl.change(defaultValue?.image);
      }
    }
  }, [defaultValue, imageControl, nameControl, fields.name.value, fields.image.value]);

  // Focus the input when the form is hydrated
  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="relative flex w-full items-start gap-2">
        <Field isRequired label="Name" errors={fields.name.errors} className="w-full">
          <Input
            {...getInputProps(fields.name, { type: 'text' })}
            ref={isEdit ? undefined : inputRef}
            key={fields.name.id}
            placeholder="e.g. netdata"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value;
              nameControl.change(value);
            }}
          />
        </Field>
        <Field isRequired label="Image" errors={fields.image.errors} className="w-full">
          <Input
            {...getInputProps(fields.image, { type: 'text' })}
            ref={isEdit ? undefined : inputRef}
            key={fields.image.id}
            placeholder="e.g. http://docker.io/netdata/netdata:latest"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value;
              imageControl.change(value);
            }}
          />
        </Field>
      </div>

      <div className="flex w-full flex-col gap-2">
        <FieldLabel label="Ports" />
        <PortsForm
          fields={
            fields as unknown as ReturnType<typeof useForm<{ ports: RuntimePortSchema[] }>>[1]
          }
          defaultValue={defaultValue?.ports}
          isEdit={isEdit}
        />
      </div>

      <div className="flex w-full flex-col gap-2">
        <FieldLabel label="Environment Variables" />
        <EnvsForm
          fields={fields as unknown as ReturnType<typeof useForm<{ envs: RuntimeEnvSchema[] }>>[1]}
          defaultValue={defaultValue?.envs}
          isEdit={isEdit}
          projectId={projectId}
        />
      </div>
    </div>
  );
};
