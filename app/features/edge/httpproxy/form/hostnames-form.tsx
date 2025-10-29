import { Field } from '@/components/field/field';
import { FieldLabel } from '@/components/field/field-label';
import { Button } from '@/modules/datum-ui/components/button.tsx';
import { Input } from '@/modules/shadcn/ui/components/input';
import { HttpProxyHostnameSchema, HttpProxySchema } from '@/resources/schemas/http-proxy.schema';
import { FormMetadata, getInputProps, useForm } from '@conform-to/react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect } from 'react';

export const HostnamesForm = ({
  form,
  fields,
  defaultValue,
}: {
  form: FormMetadata<HttpProxySchema>;
  fields: ReturnType<typeof useForm<HttpProxyHostnameSchema>>[1];
  defaultValue?: string[];
}) => {
  const hostnameList = fields.hostnames.getFieldList();

  useEffect(() => {
    if (defaultValue && defaultValue.length > 0) {
      form.update({
        name: fields.hostnames.name,
        value: defaultValue,
      });
    }
  }, [defaultValue]);

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label="Hostnames" />

      {hostnameList.length > 0 && (
        <div className="space-y-4">
          {hostnameList.map((field, index) => {
            return (
              <div className="relative flex items-start gap-2" key={field.key}>
                <Field errors={field.errors} className="w-full">
                  <Input
                    {...getInputProps(field, { type: 'text' })}
                    key={field.key}
                    name={field.name}
                    id={field.id}
                    placeholder="e.g. api.example.com"
                  />
                </Field>
                {hostnameList.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive relative top-0.5 w-fit"
                    onClick={() => form.remove({ name: fields.hostnames.name, index })}>
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
            name: fields.hostnames.name,
            defaultValue: '',
          })
        }>
        <PlusIcon className="size-4" />
        Add
      </Button>
    </div>
  );
};
