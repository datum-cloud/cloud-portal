import { SingleDatePicker } from '@/components/date-picker/single-date-picker';
import { machineAccountKeyCreateSchema } from '@/resources/machine-accounts';
import { Button } from '@datum-cloud/datum-ui/button';
import { Form } from '@datum-cloud/datum-ui/form';
import { cn } from '@datum-cloud/datum-ui/utils';
import { KeyRoundIcon, ShieldIcon } from 'lucide-react';
import type { z } from 'zod';

export interface Step2Values {
  name: string;
  type: 'datum-managed' | 'user-managed';
  publicKey?: string;
  expiresAt?: string;
}

type Step2Schema = z.infer<typeof machineAccountKeyCreateSchema>;

const STEP2_DEFAULTS: Step2Schema = {
  name: '',
  type: 'datum-managed',
  publicKey: '',
  expiresAt: '',
};

interface KeyTypeCardProps {
  selected: boolean;
  onSelect: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
}

function KeyTypeCard({
  selected,
  onSelect,
  icon: IconComponent,
  title,
  description,
}: KeyTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'focus-visible:ring-ring flex flex-1 flex-col gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}>
      <div className="flex items-center gap-2">
        <IconComponent
          className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <p className="text-muted-foreground text-xs">{description}</p>
    </button>
  );
}

interface WizardStepKeyProps {
  defaultValues?: Partial<Step2Values>;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: (values: Step2Values) => void;
}

export function WizardStepKey({
  defaultValues,
  isSubmitting,
  onBack,
  onSubmit,
}: WizardStepKeyProps) {
  const mergedDefaults: Step2Schema = {
    ...STEP2_DEFAULTS,
    ...defaultValues,
  };

  const handleSubmit = (data: Step2Schema) => {
    onSubmit({
      name: data.name,
      type: data.type,
      publicKey: data.type === 'user-managed' ? data.publicKey || undefined : undefined,
      expiresAt: data.expiresAt || undefined,
    });
  };

  return (
    <Form.Root
      schema={machineAccountKeyCreateSchema}
      defaultValues={mergedDefaults}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      className="space-y-0">
      <KeyFormBody isSubmitting={isSubmitting} onBack={onBack} />
    </Form.Root>
  );
}

function KeyFormBody({
  isSubmitting,
  onBack,
}: Pick<WizardStepKeyProps, 'isSubmitting' | 'onBack'>) {
  const keyType = Form.useWatch<Step2Values['type']>('type') ?? 'datum-managed';

  return (
    <div className="space-y-6">
      <Form.Field name="type" label="Key Type" required>
        {({ control }) => (
          <>
            <div className="flex gap-3 pt-1" role="group" aria-label="Key type">
              <KeyTypeCard
                selected={keyType === 'datum-managed'}
                onSelect={() => control.change('datum-managed')}
                icon={KeyRoundIcon}
                title="Datum-managed key"
                description="Datum generates a secure RSA key pair. The private key is shown once at creation and never stored."
              />
              <KeyTypeCard
                selected={keyType === 'user-managed'}
                onSelect={() => control.change('user-managed')}
                icon={ShieldIcon}
                title="User-managed key"
                description="You generate your own key pair and provide Datum with the public key (PEM format)."
              />
            </div>
            {/* Hidden input so Conform can track the value */}
            <input type="hidden" name="type" value={keyType} />
          </>
        )}
      </Form.Field>

      <Form.Field name="name" label="Name" required>
        {({ control }) => (
          <Form.Input
            placeholder="my-key"
            autoFocus
            value={control.value as string}
            onChange={(e) => control.change(e.target.value)}
          />
        )}
      </Form.Field>

      {keyType === 'user-managed' && (
        <Form.Field name="publicKey" label="Public Key" required>
          {({ control }) => (
            <Form.Textarea
              rows={5}
              placeholder="Paste your RSA public key in PEM format (begins with -----BEGIN PUBLIC KEY-----)"
              value={control.value as string}
              onChange={(e) => control.change(e.target.value)}
            />
          )}
        </Form.Field>
      )}

      <Form.Field
        name="expiresAt"
        label="Expires"
        description="Recommended: 90 days for CI/CD, 1 year for long-lived services. Leave blank for no expiration.">
        {({ control }) => (
          <SingleDatePicker
            value={control.value as string}
            onChange={(value) => control.change(value)}
            disablePast
            placeholder="Select expiration date"
          />
        )}
      </Form.Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          htmlType="button"
          type="secondary"
          theme="outline"
          onClick={onBack}
          disabled={isSubmitting}>
          Back
        </Button>
        <Form.Submit loadingText="Creating...">Create</Form.Submit>
      </div>
    </div>
  );
}
