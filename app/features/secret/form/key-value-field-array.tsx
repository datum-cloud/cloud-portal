import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import { Textarea } from '@datum-cloud/datum-ui/textarea';
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
            className="w-full sm:w-fit"
            onClick={() => append({ key: '', value: '' })}>
            <Icon icon={PlusIcon} className="size-4" />
            Add
          </Button>
        </div>
      )}
    </Form.FieldArray>
  );
}
