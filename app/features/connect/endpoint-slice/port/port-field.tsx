import { Field } from '@/components/field/field';
import {
  EndpointSlicePortPort,
  EndpointSlicePortProtocol,
} from '@/resources/interfaces/endpoint-slice.interface';
import { EndpointSlicePortSchema } from '@/resources/schemas/endpoint-slice.schema';
import { getInputProps, getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';
import { useEffect } from 'react';

export const PortField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<EndpointSlicePortSchema>>[1];
  defaultValue?: EndpointSlicePortSchema;
}) => {
  const nameControl = useInputControl(fields.name);
  const appProtocolControl = useInputControl(fields.appProtocol);

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.name && fields.name.value === '') {
        nameControl.change(defaultValue?.name);
      }

      if (defaultValue.appProtocol && !fields.appProtocol.value) {
        appProtocolControl.change(defaultValue?.appProtocol);
      }
    }
  }, [defaultValue, nameControl, fields.name.value, appProtocolControl, fields.appProtocol.value]);

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <div className="flex w-full gap-4">
        <Field isRequired label="Name" errors={fields.name.errors} className="w-3/4">
          <Input
            {...getInputProps(fields.name, { type: 'text' })}
            key={fields.name.id}
            placeholder="e.g. port-80"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value;
              nameControl.change(value);
            }}
          />
        </Field>
        <Field
          isRequired
          label="App Protocol"
          errors={fields.appProtocol.errors}
          className="w-1/4"
          description={`Port to listen on: ${EndpointSlicePortPort[fields.appProtocol.value as keyof typeof EndpointSlicePortProtocol]}`}>
          <Select
            {...getSelectProps(fields.appProtocol)}
            key={fields.appProtocol.id}
            value={appProtocolControl.value}
            defaultValue={defaultValue?.appProtocol}
            onValueChange={(value) => {
              appProtocolControl.change(value);
            }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a storage type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(EndpointSlicePortProtocol).map((protocol) => (
                <SelectItem key={protocol} value={protocol} className="uppercase">
                  {protocol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
};
