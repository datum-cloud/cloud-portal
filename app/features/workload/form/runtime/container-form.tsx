import { ContainerField } from './container-field';
import { Button } from '@/modules/datum-ui/components/button.tsx';
import { RuntimeContainerSchema, RuntimeSchema } from '@/resources/schemas/workload.schema';
import { useForm, useFormMetadata } from '@conform-to/react';
import { cn } from '@shadcn/lib/utils';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect } from 'react';

export const ContainerForm = ({
  isEdit,
  fields,
  defaultValue,
  projectId,
}: {
  isEdit: boolean;
  fields: ReturnType<typeof useForm<RuntimeSchema>>[1];
  defaultValue?: RuntimeContainerSchema[];
  projectId?: string;
}) => {
  const form = useFormMetadata('workload-form');
  const containers = fields.containers.getFieldList();

  useEffect(() => {
    if (defaultValue) {
      form.update({
        name: fields.containers.name,
        value: defaultValue as RuntimeContainerSchema[],
      });
    }
  }, [defaultValue]);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="space-y-4">
        {containers.map((container, index) => {
          const containerFields = container.getFieldset();
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={container.key}>
              <ContainerField
                isEdit={isEdit}
                defaultValue={defaultValue?.[index]}
                projectId={projectId}
                fields={
                  containerFields as unknown as ReturnType<
                    typeof useForm<RuntimeContainerSchema>
                  >[1]
                }
              />

              {containers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'text-destructive relative w-fit',
                    (containerFields.name.errors ?? []).length > 0 ||
                      (containerFields.image.errors ?? []).length > 0
                      ? '-top-1'
                      : 'top-2.5'
                  )}
                  onClick={() => form.remove({ name: fields.containers.name, index })}>
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
        className="w-fit"
        onClick={() =>
          form.insert({
            name: fields.containers.name,
            defaultValue: { name: '', image: '' },
          })
        }>
        <PlusIcon className="size-4" />
        Add Container
      </Button>
    </div>
  );
};
