import { BackendRefField } from './backend-ref-field';
import { FieldLabel } from '@/components/field/field-label';
import {
  HttpRouteBackendRefSchema,
  HttpRouteRuleSchema,
} from '@/resources/schemas/http-route.schema';
import { useForm, useFormMetadata } from '@conform-to/react';
import { Button } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect } from 'react';

export const BackendRefDefaultValues: HttpRouteBackendRefSchema = {
  name: '',
  port: 80,
};

export const BackendRefsForm = ({
  fields,
  defaultValue,
  projectId,
  selectedEndpointSlice,
}: {
  fields: ReturnType<typeof useForm<HttpRouteRuleSchema>>[1];
  defaultValue?: HttpRouteBackendRefSchema[];
  projectId?: string;
  selectedEndpointSlice?: string[];
}) => {
  const form = useFormMetadata('http-route-form');
  const backendRefList = fields.backendRefs.getFieldList();

  useEffect(() => {
    if (defaultValue) {
      form.update({
        name: fields.backendRefs.name,
        value: defaultValue,
      });
    }
  }, [defaultValue]);

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel isRequired label="Backend Refs" />

      <div className="space-y-4">
        {backendRefList.map((backendRef, index) => {
          const backendRefFields = backendRef.getFieldset();
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={backendRef.key}>
              <BackendRefField
                selectedEndpointSlice={selectedEndpointSlice}
                fields={
                  backendRefFields as unknown as ReturnType<
                    typeof useForm<HttpRouteBackendRefSchema>
                  >[1]
                }
                defaultValue={defaultValue?.[index]}
                projectId={projectId}
              />
              {backendRefList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-destructive relative w-fit',
                    (backendRefFields.name.errors ?? []).length > 0 ||
                      (backendRefFields.port.errors ?? []).length > 0
                      ? '-top-1'
                      : 'top-2.5'
                  )}
                  onClick={() => form.remove({ name: fields.backendRefs.name, index })}>
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
            name: fields.backendRefs.name,
            defaultValue: BackendRefDefaultValues,
          })
        }>
        <PlusIcon className="size-4" />
        Add
      </Button>
    </div>
  );
};
