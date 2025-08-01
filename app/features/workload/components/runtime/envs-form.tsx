import { EnvField } from './env-field';
import { Button } from '@/components/ui/button';
import { RuntimeEnvSchema } from '@/resources/schemas/workload.schema';
import { cn } from '@/utils/misc';
import { useForm, useFormMetadata } from '@conform-to/react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect } from 'react';

export const EnvsForm = ({
  fields,
  defaultValue,
  isEdit = false,
  projectId,
}: {
  fields: ReturnType<typeof useForm<{ envs: RuntimeEnvSchema[] }>>[1];
  defaultValue?: RuntimeEnvSchema[];
  isEdit?: boolean;
  projectId?: string;
}) => {
  const form = useFormMetadata('workload-form');
  const envs = fields.envs?.getFieldList();

  useEffect(() => {
    if (defaultValue) {
      form.update({
        name: fields.envs.name,
        value: defaultValue as RuntimeEnvSchema[],
      });
    }
  }, [defaultValue]);

  return (
    <div className="flex w-full flex-col gap-2">
      {envs?.length > 0 && (
        <div className="space-y-4">
          {envs?.map((env, index) => {
            const envFields = env.getFieldset();
            return (
              <div className="relative flex items-center gap-2 rounded-md border p-4" key={env.key}>
                <EnvField
                  isEdit={isEdit}
                  defaultValue={defaultValue?.[index]}
                  projectId={projectId}
                  fields={envFields as ReturnType<typeof useForm<RuntimeEnvSchema>>[1]}
                />
                {envs.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'text-destructive relative w-fit',
                      (envFields.name.errors ?? []).length > 0 ||
                        (envFields.type.errors ?? []).length > 0 ||
                        (envFields.value.errors ?? []).length > 0 ||
                        (envFields.key.errors ?? []).length > 0
                        ? '-top-1'
                        : 'top-2.5'
                    )}
                    onClick={() => form.remove({ name: fields.envs.name, index })}>
                    <TrashIcon className="size-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() =>
          form.insert({
            name: fields.envs.name,
            defaultValue: { name: '', type: undefined, value: '', key: undefined },
          })
        }>
        <PlusIcon className="size-4" />
        Add Environment Variable
      </Button>
    </div>
  );
};
