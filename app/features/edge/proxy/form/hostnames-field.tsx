import { SubdomainHostnameField } from '@/features/edge/proxy/form/subdomain-hostname-field';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form, useFormContext } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PlusIcon } from 'lucide-react';
import { forwardRef } from 'react';

interface ProxyHostnamesFieldProps {
  projectId: string;
  /** Proxy display name for smart suggestions */
  proxyDisplayName?: string;
}

export const ProxyHostnamesField = forwardRef<HTMLDivElement, ProxyHostnamesFieldProps>(
  ({ projectId, proxyDisplayName }, ref) => {
    const { fields: formFields } = useFormContext();

    const hostnameFieldList = (formFields.hostnames as any)?.getFieldList?.() ?? [];
    const selectedHostnames: string[] = hostnameFieldList.map((f: any) => f.value).filter(Boolean);

    const getExcludeValues = (currentIndex: number) =>
      selectedHostnames.filter((_v, i) => i !== currentIndex);

    return (
      <div ref={ref} className="flex flex-col gap-2">
        <span className="text-xs font-semibold">Hostnames</span>

        <Form.FieldArray name="hostnames">
          {({ fields, append, remove }) => (
            <>
              {fields.length > 0 && (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Form.Field key={field.key} name={field.name}>
                      <SubdomainHostnameField
                        projectId={projectId}
                        proxyDisplayName={proxyDisplayName}
                        excludeValues={getExcludeValues(index)}
                        onRemove={() => remove(index)}
                      />
                    </Form.Field>
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
  }
);

ProxyHostnamesField.displayName = 'ProxyHostnamesField';
