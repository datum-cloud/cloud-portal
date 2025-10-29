import { URLRewriteField } from './url-rewrite-field';
import { Field } from '@/components/field/field';
import { HTTPFilterType } from '@/resources/interfaces/http-route.interface';
import { HttpURLRewriteSchema, HttpRouteFilterSchema } from '@/resources/schemas/http-route.schema';
import { getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';
import { useEffect } from 'react';

export const FilterField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<HttpRouteFilterSchema>>[1];
  defaultValue?: HttpRouteFilterSchema;
}) => {
  const typeControl = useInputControl(fields.type);

  useEffect(() => {
    if (defaultValue && !fields.type.value) {
      typeControl.change(defaultValue.type);
    }
  }, [defaultValue, fields.type.value, typeControl]);

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <Field isRequired label="Type" errors={fields.type.errors} className="w-1/2">
        <Select
          {...getSelectProps(fields.type)}
          key={fields.type.id}
          value={typeControl.value}
          defaultValue={defaultValue?.type}
          onValueChange={(value) => {
            typeControl.change(value);
          }}>
          <SelectTrigger disabled>
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(HTTPFilterType).map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {typeControl.value === HTTPFilterType.URL_REWRITE && (
        <URLRewriteField
          fields={
            fields.urlRewrite.getFieldset() as unknown as ReturnType<
              typeof useForm<HttpURLRewriteSchema>
            >[1]
          }
          defaultValue={defaultValue?.urlRewrite}
        />
      )}
    </div>
  );
};
