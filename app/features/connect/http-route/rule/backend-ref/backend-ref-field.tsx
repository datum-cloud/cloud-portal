import { SelectEndpointSlice } from '../../select-endpoint-slices';
import { Field } from '@/components/field/field';
import { Input } from '@/components/ui/input';
import { HttpRouteBackendRefSchema } from '@/resources/schemas/http-route.schema';
import { getInputProps, getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { useEffect } from 'react';

export const BackendRefField = ({
  fields,
  defaultValue,
  projectId,
  selectedEndpointSlice,
}: {
  fields: ReturnType<typeof useForm<HttpRouteBackendRefSchema>>[1];
  defaultValue?: HttpRouteBackendRefSchema;
  projectId?: string;
  selectedEndpointSlice?: string[];
}) => {
  const nameControl = useInputControl(fields.name);
  const portControl = useInputControl(fields.port);

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.name && fields.name.value === '') {
        nameControl.change(defaultValue?.name);
      }

      if (defaultValue.port && fields.port.value === '') {
        portControl.change(defaultValue?.port.toString());
      }
    }
  }, [defaultValue, nameControl, fields.name.value, portControl, fields.port.value]);

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <div className="flex w-full gap-4">
        <Field isRequired label="Endpoint Slice" errors={fields.name.errors} className="w-1/2">
          <SelectEndpointSlice
            {...getSelectProps(fields.name, { value: false })}
            name={fields.name.name}
            id={fields.name.id}
            key={fields.name.id}
            value={nameControl.value}
            projectId={projectId}
            exceptItems={selectedEndpointSlice}
            onValueChange={(value) => {
              nameControl.change(value?.value);
            }}
          />
        </Field>
        <Field isRequired label="Port" errors={fields.port.errors} className="w-1/2">
          <Input
            {...getInputProps(fields.port, {
              type: 'number',
              min: 1,
              max: 65535,
            })}
            min={1}
            max={65535}
            key={fields.port.id}
            placeholder="e.g. 80"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value;
              portControl.change(value);
            }}
          />
        </Field>
      </div>
    </div>
  );
};
