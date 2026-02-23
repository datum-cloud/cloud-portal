import { Button } from '@datum-ui/components';
import { Form } from '@datum-ui/components/form';
import { Input } from '@datum-ui/components/form/primitives/input';
import { Textarea } from '@datum-ui/components/form/primitives/textarea';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { PlusIcon, Trash2Icon } from 'lucide-react';

interface KeyValueFieldArrayProps {
  name?: string;
}

export function KeyValueFieldArray({ name = 'variables' }: KeyValueFieldArrayProps) {
  return (
    <Form.FieldArray name={name}>
      {({ fields, append, remove }) => (
        <div className="flex flex-col gap-3">
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.key} className="flex items-start gap-2">
                <Form.Field
                  name={`${name}.${index}.key`}
                  label={index === 0 ? 'Key' : undefined}
                  className="flex-1"
                  required>
                  {({ control }) => (
                    <Input
                      value={(control.value as string) ?? ''}
                      onChange={(e) => control.change(e.target.value)}
                      onBlur={control.blur}
                      onFocus={control.focus}
                      placeholder="e.g. username"
                      className="text-xs!"
                    />
                  )}
                </Form.Field>
                <Form.Field
                  name={`${name}.${index}.value`}
                  label={index === 0 ? 'Value' : undefined}
                  className="flex-1"
                  required>
                  {({ control }) => (
                    <Textarea
                      value={(control.value as string) ?? ''}
                      onChange={(e) => control.change(e.target.value)}
                      onBlur={control.blur}
                      onFocus={control.focus}
                      placeholder="value"
                      className="min-h-10"
                      rows={1}
                    />
                  )}
                </Form.Field>
                {fields.length > 1 && (
                  <Button
                    htmlType="button"
                    type="quaternary"
                    theme="borderless"
                    size="small"
                    aria-label={`Remove entry ${index + 1}`}
                    className={`text-destructive w-fit ${index === 0 ? 'mt-6' : ''}`}
                    onClick={() => remove(index)}>
                    <Icon icon={Trash2Icon} className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="small"
            className="w-fit"
            onClick={() => append({ key: '', value: '' })}>
            <Icon icon={PlusIcon} className="size-4" />
            Add
          </Button>
        </div>
      )}
    </Form.FieldArray>
  );
}
