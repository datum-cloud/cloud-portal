import { Field } from '@/components/field/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HTTPPathMatchType } from '@/resources/interfaces/http-route.interface';
import { HttpPathMatchSchema } from '@/resources/schemas/http-route.schema';
import { getInputProps, getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { useEffect } from 'react';

export const PathField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<HttpPathMatchSchema>>[1];
  defaultValue?: HttpPathMatchSchema;
}) => {
  const typeControl = useInputControl(fields.type);
  const valueControl = useInputControl(fields.value);

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.type && !fields.type.value) {
        typeControl.change(defaultValue?.type);
      }

      if (defaultValue.value && fields.value.value === '') {
        valueControl.change(defaultValue?.value);
      }
    }
  }, [defaultValue, typeControl, fields.type.value, valueControl, fields.value.value]);

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <div className="flex w-full gap-4">
        <Field isRequired label="Type" errors={fields.type.errors} className="w-1/3">
          <Select
            {...getSelectProps(fields.type)}
            key={fields.type.id}
            value={typeControl.value}
            defaultValue={defaultValue?.type}
            onValueChange={(value) => {
              typeControl.change(value);
            }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(HTTPPathMatchType).map((protocol) => (
                <SelectItem key={protocol} value={protocol}>
                  {protocol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field isRequired label="Value" errors={fields.value.errors} className="w-2/3">
          <Input
            {...getInputProps(fields.value, { type: 'text' })}
            key={fields.value.id}
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
