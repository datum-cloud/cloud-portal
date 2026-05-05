import { type OrchestrationPhase, useWizardOrchestration } from './use-wizard-orchestration';
import { WizardStepAccount } from './wizard-step-account';
import { WizardStepFailure } from './wizard-step-failure';
import { keyStepSchema, WizardStepKey } from './wizard-step-key';
import { USE_CASE_DEFAULTS } from './wizard.types';
import {
  serviceAccountCreateSchema,
  type CreateServiceAccountKeyResponse,
  type UseCase,
} from '@/resources/service-accounts';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import {
  FormStep,
  FormStepper,
  StepperControls,
  StepperNavigation,
} from '@datum-cloud/datum-ui/form/stepper';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { addDays, format } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';

const RUNNING_MESSAGE: Record<OrchestrationPhase, string> = {
  polling: 'Setting up identity for your account...',
  'creating-key': 'Generating authentication key...',
};

export interface CreateServiceAccountWizardProps {
  projectId: string;
  /**
   * Use-case the user picked from the picker page. Threaded into:
   *  - default key expiry length (90d for cicd, 365d for service)
   *  - the K8s annotation `iam.miloapis.com/use-case`
   *  - `defaultRevealTab` passed back to the keys page
   */
  useCase?: UseCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToAccount: (
    accountName: string,
    keyResponse?: CreateServiceAccountKeyResponse,
    defaultRevealTab?: 'github' | 'kubernetes'
  ) => void;
}

// FormStepper auto-merges step schemas. Step 2 uses `keyName` (not `name`,
// see keyStepSchema) so the merged form data has no name collisions.
const STEPS = [
  { id: 'account', label: 'Account Details', schema: serviceAccountCreateSchema },
  { id: 'key', label: 'Authentication Key', schema: keyStepSchema },
];

const DIALOG_TITLES: Record<UseCase | 'default', string> = {
  cicd: 'Create CI/CD Service Account',
  service: 'Create Service Workload Account',
  default: 'Create Service Account',
};

function buildFormDefaults(useCase: UseCase | undefined) {
  const expiryDays = useCase ? USE_CASE_DEFAULTS[useCase].expiryDays : undefined;
  const expiresAt = expiryDays ? format(addDays(new Date(), expiryDays), 'yyyy-MM-dd') : '';

  return {
    name: '',
    displayName: '',
    keyName: '',
    type: 'datum-managed' as const,
    publicKey: '',
    expiresAt,
  };
}

export function CreateServiceAccountWizard({
  projectId,
  useCase,
  open,
  onOpenChange,
  onNavigateToAccount,
}: CreateServiceAccountWizardProps) {
  const [accountCreateError, setAccountCreateError] = useState<string | null>(null);
  // True while `service.create()` is awaiting. Form stays mounted; the
  // StepperControls Submit button shows a loading state. On error the
  // form re-enables; on success the wizard transitions to the post-form
  // orchestration view (so `isSubmitting` becomes irrelevant).
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { state, isRunning, start, retryKey, retryPolling, reset } = useWizardOrchestration({
    projectId,
    useCase,
    onSuccess: (account, keyResponse) => {
      const tab = useCase ? USE_CASE_DEFAULTS[useCase].revealTab : undefined;
      onNavigateToAccount(account.name, keyResponse, tab);
      onOpenChange(false);
    },
    onAccountCreateError: setAccountCreateError,
  });

  // Recomputed when the picker flips between cards so the date is fresh and
  // the default expiry follows the new use case.
  const formDefaults = useMemo(() => buildFormDefaults(useCase), [useCase]);

  // Has an account been created in any post-form state? Closing the dialog
  // after that point should navigate to /keys instead of discarding.
  const createdAccount =
    state.kind === 'running' || state.kind === 'partial-failure' || state.kind === 'poller-failure'
      ? state.createdAccount
      : undefined;

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    // Backdrop / X click during any in-flight phase is ignored — covers
    // both `isSubmitting` (account-create call) and `isRunning` (post-form
    // orchestration). Recovery states ARE closeable; the user navigates
    // to /keys via the failure card's "Go to Keys" button.
    if (isSubmitting || isRunning) return;

    if (createdAccount) {
      onNavigateToAccount(createdAccount.name);
    }
    reset();
    setAccountCreateError(null);
    onOpenChange(false);
  }

  async function handleComplete(data: Record<string, unknown>) {
    setAccountCreateError(null);
    setIsSubmitting(true);
    try {
      await start({
        account: {
          name: data.name as string,
          displayName: (data.displayName as string) || undefined,
        },
        key: {
          name: data.keyName as string,
          type: data.type as 'datum-managed' | 'user-managed',
          publicKey:
            data.type === 'user-managed' ? (data.publicKey as string) || undefined : undefined,
          expiresAt: (data.expiresAt as string) || undefined,
        },
      });
    } finally {
      // On success the wizard has already transitioned to `running` and
      // re-renders without the FormStepper, so flipping this back is
      // cosmetic. On error the form is still mounted; clearing the flag
      // re-enables the Submit button so the user can retry.
      setIsSubmitting(false);
    }
  }

  const formDialogTitle = DIALOG_TITLES[useCase ?? 'default'];

  const contentClass = state.kind === 'partial-failure' ? 'sm:max-w-3xl' : 'sm:max-w-2xl';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content className={contentClass}>
        {state.kind === 'idle' ? (
          // Form mode — grafana-style sectioned shell with header/footer borders.
          <FormStepper
            steps={STEPS}
            defaultValues={formDefaults}
            onComplete={handleComplete}
            className="flex min-h-0 flex-1 flex-col space-y-0">
            <Dialog.Header
              title={formDialogTitle}
              className="border-stepper-line border-b"
              onClose={() => handleOpenChange(false)}
            />
            <Dialog.Body className="p-0">
              <div className="border-stepper-line border-b p-5">
                <StepperNavigation variant="horizontal" className="mx-auto w-[265px]" />
              </div>

              {accountCreateError && (
                <div className="border-stepper-line border-b px-5 py-4">
                  <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm">
                    {accountCreateError}
                  </div>
                </div>
              )}

              <FormStep id="account">
                <WizardStepAccount projectId={projectId} />
              </FormStep>

              <FormStep id="key">
                <WizardStepKey useCase={useCase} />
              </FormStep>
            </Dialog.Body>
            <Dialog.Footer className="border-stepper-line border-t">
              <StepperControls
                prevLabel={(isFirst) => (isFirst ? 'Cancel' : 'Back')}
                nextLabel={(isLast) => (isLast ? 'Submit' : 'Continue')}
                loading={isSubmitting}
                disabled={isSubmitting}
                loadingText="Creating..."
                onCancel={() => handleOpenChange(false)}
              />
            </Dialog.Footer>
          </FormStepper>
        ) : (
          <>
            <Dialog.Body className="p-0">
              <AnimatePresence mode="wait">
                {state.kind === 'running' && (
                  <motion.div
                    key="running"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex min-h-[346px] flex-col items-center justify-center gap-4 px-5 text-center"
                    role="status"
                    aria-label="Wizard orchestration progress">
                    <SpinnerIcon size="xl" aria-hidden="true" />
                    <p className="text-foreground text-sm font-semibold">
                      {RUNNING_MESSAGE[state.phase]}
                    </p>
                  </motion.div>
                )}

                {state.kind === 'partial-failure' && (
                  <WizardStepFailure
                    key="partial-failure"
                    title="Service account created, but key creation failed"
                    description={
                      <>
                        <span className="text-foreground font-medium">
                          &ldquo;{state.createdAccount.name}&rdquo;
                        </span>{' '}
                        was created successfully. The key could not be created: {state.error}
                      </>
                    }
                    retryLabel="Retry Key Creation"
                    onRetry={retryKey}
                    onGoToKeys={() => {
                      onNavigateToAccount(state.createdAccount.name);
                      reset();
                      onOpenChange(false);
                    }}
                  />
                )}

                {state.kind === 'poller-failure' && (
                  <WizardStepFailure
                    key="poller-failure"
                    title="Account created, but identity setup is taking longer than expected"
                    description={
                      <>
                        <span className="text-foreground font-medium">
                          &ldquo;{state.createdAccount.name}&rdquo;
                        </span>{' '}
                        was created. The identity provider has not assigned an email yet:{' '}
                        {state.error}
                      </>
                    }
                    retryLabel="Retry Setup"
                    onRetry={retryPolling}
                    onGoToKeys={() => {
                      onNavigateToAccount(state.createdAccount.name);
                      reset();
                      onOpenChange(false);
                    }}
                  />
                )}
              </AnimatePresence>
            </Dialog.Body>
          </>
        )}
      </Dialog.Content>
    </Dialog>
  );
}
