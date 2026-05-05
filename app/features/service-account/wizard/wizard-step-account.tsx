import { InputName } from '@/components/input-name/input-name';
import { Form, useWatch, type NormalizedFieldState } from '@datum-cloud/datum-ui/form';
import { cn } from '@datum-cloud/datum-ui/utils';

export interface Step1Values {
  name: string;
  displayName?: string;
}

interface ResourceNameInputProps {
  field: NormalizedFieldState;
  projectId: string;
}

/**
 * Auto-generated resource name field. Mirrors the org-dialog pattern:
 * the user types a friendly display name above; this field watches that
 * value and asks <InputName> to derive a kebab-cased identifier with a
 * random suffix. The user can uncheck "Auto-generate" to type their own.
 *
 * <Form.Field> wraps this component (in WizardStepAccount below) so Zod
 * validation errors render automatically; <InputName> alone only colors
 * the label red and would not show the error message text.
 */
function ResourceNameInput({ field, projectId }: ResourceNameInputProps) {
  const displayName = useWatch('displayName') as string | undefined;
  const name = useWatch('name') as string | undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <InputName
        field={field}
        label="Resource Name"
        description="This unique resource name will identify your service account and cannot be changed."
        baseName={displayName}
        showTooltip={false}
        required
      />
      <p className={cn('text-xs', name ? 'text-muted-foreground' : 'text-muted-foreground/50')}>
        Identity email:{' '}
        <span className="font-mono">
          {name || '<name>'}@{projectId}.iam.datumapis.com
        </span>
      </p>
    </div>
  );
}

export interface WizardStepAccountProps {
  projectId: string;
}

/**
 * Pure form body for step 1. Owns its own padding + per-field dividers;
 * the wizard parent's <FormStep> renders this directly without an extra
 * wrapper. No <Form.Root>, no buttons — those are owned by <FormStepper>
 * and <StepperControls>.
 */
export function WizardStepAccount({ projectId }: WizardStepAccountProps) {
  return (
    <div className="divide-stepper-line space-y-0 divide-y [&>*]:p-5">
      <Form.Field
        name="displayName"
        label="Service Account Name"
        description="A friendly name to recognize this account in lists. This can be changed later."
        required>
        <Form.Input placeholder="e.g. My Service Account" autoFocus />
      </Form.Field>

      <Form.Field name="name">
        {({ field }) => <ResourceNameInput field={field} projectId={projectId} />}
      </Form.Field>
    </div>
  );
}
