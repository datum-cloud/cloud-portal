import { EndpointField } from './endpoint-field';
import { FieldLabel } from '@/components/field/field-label';
import { Button } from '@/components/ui/button';
import {
  EndpointSliceEndpointSchema,
  EndpointSliceSchema,
} from '@/resources/schemas/endpoint-slice.schema';
import { cn } from '@/utils/common';
import { useForm, useFormMetadata } from '@conform-to/react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect } from 'react';

const defaultEndpointValue: EndpointSliceEndpointSchema = {
  addresses: [],
  conditions: ['ready', 'reachable', 'terminating'],
};

export const EndpointsForm = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<EndpointSliceSchema>>[1];
  defaultValue?: EndpointSliceEndpointSchema[];
}) => {
  const form = useFormMetadata('endpoint-slice-form');
  const endpointList = fields.endpoints.getFieldList();

  useEffect(() => {
    if (defaultValue && defaultValue.length > 0) {
      form.update({
        name: fields.endpoints.name,
        value: defaultValue,
      });
    } else if (endpointList.length === 0) {
      form.insert({
        name: fields.endpoints.name,
        defaultValue: defaultEndpointValue,
      });
    }
  }, [defaultValue]);

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel label="Endpoints" />

      <div className="space-y-4">
        {endpointList.map((endpoint, index) => {
          const endpointFields = endpoint.getFieldset();
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={endpoint.key}>
              <EndpointField
                fields={
                  endpointFields as unknown as ReturnType<
                    typeof useForm<EndpointSliceEndpointSchema>
                  >[1]
                }
                defaultValue={defaultValue?.[index]}
              />

              {endpointList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn('text-destructive relative top-2 w-fit')}
                  onClick={() => form.remove({ name: fields.endpoints.name, index })}>
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-1 w-fit"
        onClick={() =>
          form.insert({
            name: fields.endpoints.name,
            defaultValue: defaultEndpointValue,
          })
        }>
        <PlusIcon className="size-4" />
        Add
      </Button>
    </div>
  );
};
