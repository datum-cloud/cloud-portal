import { NotificationCheckboxItem } from './notification-checkbox-item';
import type { NotificationSettingsCardProps } from './types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import type { z } from 'zod';

export function NotificationSettingsCard<T extends z.ZodObject<z.ZodRawShape>>({
  title,
  schema,
  defaultValues,
  preferences,
  onSubmit,
  isLoading,
  renderItem,
}: NotificationSettingsCardProps<T>) {
  const ItemRenderer = renderItem ?? NotificationCheckboxItem;

  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>

      <Form.Root
        schema={schema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
        isSubmitting={isLoading}
        className="flex flex-col space-y-0">
        {({ form, isSubmitting }) => (
          <>
            <CardContent className="space-y-4 px-5 py-4">
              {preferences.map((pref) => (
                <Form.Field key={pref.name} name={pref.name}>
                  <ItemRenderer preference={pref} Checkbox={Form.Checkbox} />
                </Form.Field>
              ))}
            </CardContent>

            <CardFooter className="flex justify-end gap-2 border-t px-5 py-4">
              <Form.Button
                onClick={() => {
                  form.reset();
                }}
                type="quaternary"
                theme="outline"
                disabled={isSubmitting}
                size="xs">
                Cancel
              </Form.Button>
              <Form.Submit size="xs" loadingText="Saving...">
                Save
              </Form.Submit>
            </CardFooter>
          </>
        )}
      </Form.Root>
    </Card>
  );
}
