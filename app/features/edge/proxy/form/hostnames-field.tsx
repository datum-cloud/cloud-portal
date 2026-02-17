import { FormSelectDomain } from '@/features/edge/domain/select-domain';
import { Button } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Form, useFormContext } from '@datum-ui/components/new-form';
import { PlusIcon, TrashIcon } from 'lucide-react';

interface ProxyHostnamesFieldProps {
  projectId: string;
}

export const ProxyHostnamesField = ({ projectId }: ProxyHostnamesFieldProps) => {
  const { fields: formFields } = useFormContext();

  // Access Conform's FieldMetadata.getFieldList() to read sibling field values.
  // Cast to `any` is needed because useFormContext returns untyped field metadata.
  const hostnameFieldList = (formFields.hostnames as any)?.getFieldList?.() ?? [];
  const selectedHostnames: string[] = hostnameFieldList.map((f: any) => f.value).filter(Boolean);

  const getExcludeValues = (currentIndex: number) =>
    selectedHostnames.filter((_v, i) => i !== currentIndex);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold">Hostnames</span>

      <Form.FieldArray name="hostnames">
        {({ fields, append, remove }) => (
          <>
            {fields.length > 0 && (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div className="relative flex items-start gap-2" key={field.key}>
                    <Form.Field name={field.name} className="w-full">
                      <FormSelectDomain
                        projectId={projectId}
                        excludeValues={getExcludeValues(index)}
                        creatable
                      />
                    </Form.Field>
                    <Button
                      htmlType="button"
                      type="quaternary"
                      theme="borderless"
                      size="small"
                      className="text-destructive relative top-0.5 w-fit"
                      onClick={() => remove(index)}>
                      <Icon icon={TrashIcon} className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              htmlType="button"
              type="quaternary"
              theme="outline"
              size="small"
              className="w-fit"
              onClick={() => append()}>
              <Icon icon={PlusIcon} className="size-4" />
              Add hostname
            </Button>
          </>
        )}
      </Form.FieldArray>
    </div>
  );
};
