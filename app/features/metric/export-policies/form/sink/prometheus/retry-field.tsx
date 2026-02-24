import { FieldLabel } from '@/components/field/field-label';
import { InputWithAddons } from '@datum-ui/components';
import { Form } from '@datum-ui/components/form';

export const RetryField = ({ baseName }: { baseName: string }) => {
  return (
    <div className="flex w-full flex-col gap-2">
      <FieldLabel label="Retry Configuration" />
      <div className="flex w-full gap-4">
        <Form.Field
          name={`${baseName}.retry.maxAttempts`}
          label="Max Attempts"
          required
          className="w-1/2">
          <Form.Input type="number" placeholder="e.g. 1" />
        </Form.Field>
        <Form.Field
          name={`${baseName}.retry.backoffDuration`}
          label="Backoff Duration"
          required
          className="w-1/2">
          {({ control }) => (
            <InputWithAddons
              type="number"
              placeholder="e.g. 5s"
              value={(control.value as string) ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => control.change(e.target.value)}
              onBlur={control.blur}
              onFocus={control.focus}
              trailing={<span className="text-muted-foreground">s</span>}
            />
          )}
        </Form.Field>
      </div>
    </div>
  );
};
