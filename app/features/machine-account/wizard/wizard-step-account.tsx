import { machineAccountCreateSchema } from '@/resources/machine-accounts';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { z } from 'zod';

// UseCase is used by the landing page tile selection — kept here as the
// canonical definition even though the wizard form no longer has a use-case field.
export type UseCase = 'cicd' | 'service';

export interface Step1Values {
  name: string;
  displayName?: string;
}

type Step1Schema = z.infer<typeof machineAccountCreateSchema>;

const STEP1_DEFAULTS: Step1Schema = {
  name: '',
  displayName: '',
};

function NamePreview({ projectId }: { projectId: string }) {
  const name = Form.useWatch<string>('name');

  return (
    <p className={cn('mt-1 text-xs', name ? 'text-muted-foreground' : 'text-muted-foreground/50')}>
      Identity email:{' '}
      <span className="font-mono">
        {name || '<name>'}@{projectId}.iam.datumapis.com
      </span>
    </p>
  );
}

interface WizardStepAccountProps {
  projectId: string;
  defaultValues?: Partial<Step1Values>;
  onNext: (values: Step1Values) => void;
  onCancel: () => void;
}

export function WizardStepAccount({
  projectId,
  defaultValues,
  onNext,
  onCancel,
}: WizardStepAccountProps) {
  const mergedDefaults: Step1Schema = {
    ...STEP1_DEFAULTS,
    ...defaultValues,
  };

  const handleSubmit = (data: Step1Schema) => {
    onNext({
      name: data.name,
      displayName: data.displayName || undefined,
    });
  };

  return (
    <Form.Root
      schema={machineAccountCreateSchema}
      defaultValues={mergedDefaults}
      onSubmit={handleSubmit}
      className="space-y-0">
      {({ isSubmitting }) => (
        <div className="space-y-5">
          <Form.Field name="name" label="Name" required>
            {({ control }) => (
              <>
                <Form.Input
                  placeholder="my-machine-account"
                  autoFocus
                  value={control.value as string}
                  onChange={(e) => control.change(e.target.value)}
                />
                <NamePreview projectId={projectId} />
              </>
            )}
          </Form.Field>

          <Form.Field name="displayName" label="Display Name">
            {({ control }) => (
              <Form.Input
                placeholder="My Machine Account"
                value={control.value as string}
                onChange={(e) => control.change(e.target.value)}
              />
            )}
          </Form.Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              htmlType="button"
              type="secondary"
              theme="outline"
              onClick={onCancel}
              disabled={isSubmitting}>
              Cancel
            </Button>
            <Form.Submit>Next</Form.Submit>
          </div>
        </div>
      )}
    </Form.Root>
  );
}
