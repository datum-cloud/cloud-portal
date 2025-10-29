import { Field } from '@/components/field/field';
import { Input } from '@/modules/shadcn/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/modules/shadcn/ui/components/select';
import { HTTPPathRewriteType } from '@/resources/interfaces/http-route.interface';
import { HttpURLRewriteSchema } from '@/resources/schemas/http-route.schema';
import { getInputProps, getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { useEffect } from 'react';

export const URLRewriteField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<HttpURLRewriteSchema>>[1];
  defaultValue?: HttpURLRewriteSchema;
}) => {
  const hostnameControl = useInputControl(fields.hostname);

  const pathFields = fields.path.getFieldset();
  const typeControl = useInputControl(pathFields?.type);
  const valueControl = useInputControl(pathFields?.value);

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.hostname && fields.hostname.value === '') {
        hostnameControl.change(defaultValue?.hostname);
      }

      if (defaultValue.path?.type && !pathFields?.type.value) {
        typeControl.change(defaultValue?.path?.type);
      }

      if (defaultValue.path?.value && pathFields?.value.value === '') {
        valueControl.change(defaultValue?.path?.value);
      }
    }
  }, [
    defaultValue,
    fields.hostname.value,
    typeControl,
    pathFields?.type.value,
    valueControl,
    pathFields?.value.value,
  ]);

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <Field isRequired label="Hostname" errors={fields.hostname.errors} className="w-full">
        <Input
          {...getInputProps(fields.hostname, { type: 'text' })}
          key={fields.hostname.id}
          placeholder="e.g. example.com"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value;
            hostnameControl.change(value);
          }}
        />
      </Field>
      <div className="flex w-full gap-4">
        <Field isRequired label="Type" errors={pathFields?.type.errors} className="w-1/3">
          <Select
            {...getSelectProps(pathFields?.type)}
            key={pathFields?.type.id}
            value={typeControl.value}
            defaultValue={defaultValue?.path?.type}
            onValueChange={(value) => {
              typeControl.change(value);
            }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(HTTPPathRewriteType).map((protocol) => (
                <SelectItem key={protocol} value={protocol}>
                  {protocol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field isRequired label="Value" errors={pathFields?.value.errors} className="w-2/3">
          <Input
            {...getInputProps(pathFields?.value, { type: 'text' })}
            key={pathFields?.value.id}
            placeholder="e.g. /path"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value;
              valueControl.change(value);
            }}
          />
        </Field>
      </div>
    </div>
  );
};
