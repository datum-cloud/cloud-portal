import { type Step1Values, WizardStepAccount } from './wizard-step-account';
import { type Step2Values, WizardStepKey } from './wizard-step-key';
import { WizardStepPartialFailure } from './wizard-step-partial-failure';
import { WizardStepPollerFailure } from './wizard-step-poller-failure';
import { type OrchestratingPhase, WizardStepProgress } from './wizard-step-progress';
import {
  createMachineAccountService,
  pollForEmail,
  type CreateMachineAccountKeyResponse,
  type MachineAccount,
} from '@/resources/machine-accounts';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type WizardState =
  | { step: 'account'; previous?: Partial<Step1Values> }
  | { step: 'key'; account: Step1Values }
  | {
      step: 'orchestrating';
      account: Step1Values;
      key: Step2Values;
      phase: OrchestratingPhase;
      createdAccount?: MachineAccount;
    }
  | {
      step: 'partial-failure';
      createdAccount: MachineAccount;
      key: Step2Values;
      email: string;
      error: string;
    }
  | {
      step: 'poller-failure';
      createdAccount: MachineAccount;
      key: Step2Values;
      error: string;
    };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CreateMachineAccountWizardProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToAccount: (accountName: string, keyResponse?: CreateMachineAccountKeyResponse) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dialogTitle(state: WizardState): string {
  switch (state.step) {
    case 'account':
    case 'key':
      return 'Create Machine Account';
    case 'orchestrating':
      return 'Setting up…';
    case 'partial-failure':
    case 'poller-failure':
      return 'Setup Incomplete';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateMachineAccountWizard({
  projectId,
  open,
  onOpenChange,
  onNavigateToAccount,
}: CreateMachineAccountWizardProps) {
  const [wizardState, setWizardState] = useState<WizardState>({ step: 'account' });
  const [keyError, setKeyError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Guards against double-click triggering two orchestration runs
  const orchestratingRef = useRef(false);

  const service = useMemo(() => createMachineAccountService(), []);

  // Tracks whether we have a created account — used to decide whether
  // "close" should navigate instead of discarding.
  const createdAccount: MachineAccount | undefined =
    wizardState.step === 'orchestrating'
      ? wizardState.createdAccount
      : wizardState.step === 'partial-failure' || wizardState.step === 'poller-failure'
        ? wizardState.createdAccount
        : undefined;

  const isOrchestrating = wizardState.step === 'orchestrating';

  // Reset wizard to initial state
  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    orchestratingRef.current = false;
    setWizardState({ step: 'account' });
    setKeyError(null);
  }

  // Handle dialog open-change. During orchestration, prevent accidental close.
  // Once an account exists, closing navigates to Keys tab.
  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    if (isOrchestrating) {
      // Block backdrop click during orchestration
      return;
    }
    if (createdAccount) {
      onNavigateToAccount(createdAccount.name);
      reset();
      onOpenChange(false);
      return;
    }
    reset();
    onOpenChange(false);
  }

  // ---------------------------------------------------------------------------
  // Orchestration
  // ---------------------------------------------------------------------------

  async function runKeyCreation(
    account: MachineAccount,
    email: string,
    key: Step2Values,
    account1Values: Step1Values
  ) {
    setWizardState({
      step: 'orchestrating',
      account: account1Values,
      key,
      phase: 'creating-key',
      createdAccount: account,
    });
    try {
      const keyResponse = await service.createKey(projectId, email, {
        name: key.name,
        type: key.type,
        publicKey: key.publicKey,
        expiresAt: key.expiresAt,
      });
      onNavigateToAccount(account.name, keyResponse);
      reset();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Key creation failed.';
      setWizardState({
        step: 'partial-failure',
        createdAccount: account,
        key,
        email,
        error: message,
      });
    } finally {
      orchestratingRef.current = false;
    }
  }

  async function orchestrate(account1: Step1Values, key: Step2Values) {
    if (orchestratingRef.current) return;
    orchestratingRef.current = true;

    const abort = new AbortController();
    abortRef.current = abort;

    // Phase 1: create account
    setWizardState({ step: 'orchestrating', account: account1, key, phase: 'creating-account' });
    let newAccount: MachineAccount;
    try {
      newAccount = await service.create(projectId, {
        name: account1.name,
        displayName: account1.displayName,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create machine account.';
      setKeyError(message);
      setWizardState({ step: 'key', account: account1 });
      orchestratingRef.current = false;
      return;
    }

    if (abort.signal.aborted) {
      orchestratingRef.current = false;
      return;
    }

    // Phase 2: poll for email
    setWizardState({
      step: 'orchestrating',
      account: account1,
      key,
      phase: 'polling',
      createdAccount: newAccount,
    });
    let email: string;
    try {
      email = await pollForEmail(projectId, newAccount.name, abort.signal);
    } catch (err) {
      if (abort.signal.aborted) {
        orchestratingRef.current = false;
        return;
      }
      const message = err instanceof Error ? err.message : 'Identity setup failed.';
      setWizardState({
        step: 'poller-failure',
        createdAccount: newAccount,
        key,
        error: message,
      });
      orchestratingRef.current = false;
      return;
    }

    if (abort.signal.aborted) {
      orchestratingRef.current = false;
      return;
    }

    // Phase 3: create key (manages orchestratingRef itself via finally)
    await runKeyCreation(newAccount, email, key, account1);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const contentClass = wizardState.step === 'partial-failure' ? 'sm:max-w-3xl' : 'sm:max-w-2xl';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content className={contentClass}>
        <Dialog.Header title={dialogTitle(wizardState)} />
        <Dialog.Body className="max-h-[80vh] overflow-y-auto px-5 py-5">
          {wizardState.step === 'account' && (
            <WizardStepAccount
              projectId={projectId}
              defaultValues={wizardState.previous}
              onNext={(values) => {
                setKeyError(null);
                setWizardState({ step: 'key', account: values });
              }}
              onCancel={() => handleOpenChange(false)}
            />
          )}

          {wizardState.step === 'key' && (
            <>
              {keyError && (
                <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-md border px-4 py-3 text-sm">
                  {keyError}
                </div>
              )}
              <WizardStepKey
                isSubmitting={isOrchestrating}
                onBack={() => setWizardState({ step: 'account', previous: wizardState.account })}
                onSubmit={(keyValues) => orchestrate(wizardState.account, keyValues)}
              />
            </>
          )}

          {wizardState.step === 'orchestrating' && <WizardStepProgress phase={wizardState.phase} />}

          {wizardState.step === 'partial-failure' && (
            <WizardStepPartialFailure
              accountName={wizardState.createdAccount.name}
              error={wizardState.error}
              onRetry={() => {
                const { createdAccount: acc, key, email } = wizardState;
                const step1: Step1Values = { name: acc.name, displayName: acc.displayName };
                runKeyCreation(acc, email, key, step1);
              }}
              onGoToKeys={() => {
                onNavigateToAccount(wizardState.createdAccount.name);
                reset();
                onOpenChange(false);
              }}
            />
          )}

          {wizardState.step === 'poller-failure' && (
            <WizardStepPollerFailure
              accountName={wizardState.createdAccount.name}
              error={wizardState.error}
              onRetry={() => {
                const { createdAccount: acc, key } = wizardState;
                const abort = new AbortController();
                abortRef.current = abort;
                orchestratingRef.current = true;
                const step1: Step1Values = { name: acc.name, displayName: acc.displayName };
                setWizardState({
                  step: 'orchestrating',
                  account: step1,
                  key,
                  phase: 'polling',
                  createdAccount: acc,
                });
                pollForEmail(projectId, acc.name, abort.signal)
                  .then((email) => {
                    if (!abort.signal.aborted) {
                      runKeyCreation(acc, email, key, step1);
                    } else {
                      orchestratingRef.current = false;
                    }
                  })
                  .catch((err) => {
                    if (abort.signal.aborted) {
                      orchestratingRef.current = false;
                      return;
                    }
                    const message = err instanceof Error ? err.message : 'Identity setup failed.';
                    setWizardState({
                      step: 'poller-failure',
                      createdAccount: acc,
                      key,
                      error: message,
                    });
                    orchestratingRef.current = false;
                  });
              }}
              onGoToKeys={() => {
                onNavigateToAccount(wizardState.createdAccount.name);
                reset();
                onOpenChange(false);
              }}
            />
          )}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
