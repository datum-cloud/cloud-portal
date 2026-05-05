import { SingleDatePicker } from '@/components/date-picker/single-date-picker';
import type { UseCase } from '@/resources/service-accounts';
import { Form } from '@datum-cloud/datum-ui/form';
import { Label } from '@datum-cloud/datum-ui/label';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { cn } from '@datum-cloud/datum-ui/utils';
import { addDays, format } from 'date-fns';
import { KeyRoundIcon, ShieldIcon } from 'lucide-react';
import { z } from 'zod';

const EXPIRES_DESCRIPTION: Record<UseCase | 'default', string> = {
  cicd: 'Recommended: 90 days for CI/CD pipelines. Switch off for no expiration.',
  service: 'Recommended: 1 year for long-lived services. Switch off for no expiration.',
  default: 'Set when the key should auto-expire, or leave off for no expiration.',
};

function defaultExpiryDate(useCase: UseCase | undefined): string {
  const days = useCase === 'service' ? 365 : 90;
  return format(addDays(new Date(), days), 'yyyy-MM-dd');
}

interface ExpirationFieldProps {
  useCase?: UseCase;
}

/**
 * Switch + conditional date picker. Toggle ON => expiresAt receives the
 * use-case-defaulted date and the picker appears for fine-tuning. Toggle
 * OFF => expiresAt is cleared (no expiration). Wrapped in <Form.Field> so
 * the underlying field state stays a single string the API expects.
 */
function ExpirationField({ useCase }: ExpirationFieldProps) {
  const description = EXPIRES_DESCRIPTION[useCase ?? 'default'];

  return (
    <Form.Field name="expiresAt">
      {({ control }) => {
        const value = (control.value ?? '') as string;
        const hasExpiration = !!value;
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <Label className="text-sm font-medium">Set expiration date</Label>
                <p className="text-muted-foreground text-xs">{description}</p>
              </div>
              <Switch
                checked={hasExpiration}
                onCheckedChange={(checked) =>
                  control.change(checked ? defaultExpiryDate(useCase) : '')
                }
              />
            </div>
            {hasExpiration && (
              <SingleDatePicker
                value={value}
                onChange={(v) => control.change(v)}
                disablePast
                placeholder="Select expiration date"
              />
            )}
          </div>
        );
      }}
    </Form.Field>
  );
}

/**
 * Wizard-local key schema. Renames `name` -> `keyName` to avoid collision
 * with step 1's `name` field when FormStepper auto-merges step schemas.
 * The wizard parent translates `keyName` -> `name` when calling the API.
 *
 * `publicKey` is conditionally required: only when `type === 'user-managed'`
 * (datum-managed keys have the server generate the keypair, so no public
 * key input is needed). superRefine surfaces the validation error at the
 * `publicKey` field path so Form.Field renders it inline.
 */
export const keyStepSchema = z
  .object({
    keyName: z.string({ error: 'Name is required.' }).min(1, 'Name is required.'),
    type: z.enum(['datum-managed', 'user-managed']).default('datum-managed'),
    publicKey: z.string().optional(),
    expiresAt: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'user-managed' && !data.publicKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publicKey'],
        message: 'Public key is required.',
      });
    }
  });

export type KeyStepSchema = z.infer<typeof keyStepSchema>;

export interface Step2Values {
  keyName: string;
  type: 'datum-managed' | 'user-managed';
  publicKey?: string;
  expiresAt?: string;
}

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

export interface WizardStepKeyProps {
  useCase?: UseCase;
}

/**
 * Pure form body for step 2. Owns its own padding + per-field dividers;
 * the wizard parent's <FormStep> renders this directly without an extra
 * wrapper. No <Form.Root>, no buttons — those are owned by <FormStepper>
 * and <StepperControls>. Expiry is a switch-toggled field; ON shows the
 * date picker, OFF means "no expiration."
 */
export function WizardStepKey({ useCase }: WizardStepKeyProps = {}) {
  const keyType = Form.useWatch<Step2Values['type']>('type') ?? 'datum-managed';

  return (
    <div className="divide-stepper-line space-y-0 divide-y [&>*]:p-5">
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

      <Form.Field name="keyName" label="Name" required>
        <Form.Input placeholder="my-key" autoFocus />
      </Form.Field>

      {keyType === 'user-managed' && (
        <Form.Field name="publicKey" label="Public Key" required>
          <Form.Textarea
            rows={5}
            placeholder="Paste your RSA public key in PEM format (begins with -----BEGIN PUBLIC KEY-----)"
          />
        </Form.Field>
      )}

      <ExpirationField useCase={useCase} />
    </div>
  );
}
