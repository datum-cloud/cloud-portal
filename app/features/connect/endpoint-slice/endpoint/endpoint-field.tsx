import { Field } from '@/components/field/field';
import { TagsInput } from '@/components/ui/tag-input';
import { EndpointSliceEndpointSchema } from '@/resources/schemas/endpoint-slice.schema';
import { getCollectionProps, getSelectProps, useForm, useInputControl } from '@conform-to/react';
import { useEffect } from 'react';

export const EndpointField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<EndpointSliceEndpointSchema>>[1];
  defaultValue?: EndpointSliceEndpointSchema;
}) => {
  const addressesControl = useInputControl(fields.addresses);
  const conditionsControl = useInputControl(fields.conditions);

  useEffect(() => {
    if (defaultValue) {
      if (defaultValue.conditions && !fields.conditions.value) {
        conditionsControl.change(defaultValue?.conditions);
      }
    }
  }, [defaultValue, conditionsControl, fields.conditions.value]);

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <div className="flex w-full gap-4">
        <Field
          isRequired
          label="Addresses"
          errors={fields.addresses.errors}
          className="w-1/2"
          description="Enter one or more addresses (e.g example.com)">
          <TagsInput
            {...getSelectProps(fields.addresses, { value: false })}
            showValidationErrors={false}
            value={(addressesControl.value as string[]) || []}
            onValueChange={(newValue) => addressesControl.change(newValue)}
            placeholder="Enter addresses"
          />
        </Field>

        <Field label="Conditions" errors={fields.conditions.errors} className="w-1/2">
          <div className="flex h-9 items-center gap-2">
            {getCollectionProps(fields.conditions, {
              type: 'checkbox',
              options: ['ready', 'reachable', 'terminating'],
            }).map((props: any) => {
              const { key, ...rest } = props;
              return (
                <div key={rest.id} className="flex items-center space-x-2">
                  <input
                    key={key}
                    className="border-primary bg-background text-primary accent-primary focus:ring-primary size-4 shrink-0 rounded-sm border transition-all duration-200 focus:ring-1 focus:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    {...rest}
                  />
                  <label
                    htmlFor={rest.id}
                    className="text-sm leading-none font-medium capitalize peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {rest.value}
                  </label>
                </div>
              );
            })}
          </div>
        </Field>
      </div>
    </div>
  );
};
