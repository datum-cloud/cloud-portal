import { Button } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Form } from '@datum-ui/components/new-form';
import { PlusIcon, TrashIcon } from 'lucide-react';

export const ProxyHostnamesField = () => {
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
                      <Form.Input placeholder="e.g. app.example.com" />
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
