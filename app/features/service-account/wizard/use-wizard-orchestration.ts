import {
  createServiceAccountService,
  pollForEmail,
  type CreateServiceAccountKeyResponse,
  type ServiceAccount,
  type UseCase,
} from '@/resources/service-accounts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * The wizard's create flow needs three sequential server interactions:
 *   1. Create the ServiceAccount         (iam.miloapis.com)
 *   2. Poll until the controller assigns an identity email
 *   3. Create the ServiceAccountKey      (identity.miloapis.com)
 *
 * Each step has its own failure mode, and steps 2 + 3 are recoverable —
 * after a partial failure, the account exists in K8s and the user can retry
 * just the failed step rather than starting over. This hook owns that state
 * machine + the cancellation primitive (abort signal for the long poll).
 *
 * Keeping this out of the React component makes it testable in isolation
 * (mock the service module) and shrinks the wizard to a UI shell.
 */

export interface AccountValues {
  name: string;
  displayName?: string;
}

export interface KeyValues {
  name: string;
  type: 'datum-managed' | 'user-managed';
  publicKey?: string;
  expiresAt?: string;
}

export interface FormData {
  account: AccountValues;
  key: KeyValues;
}

// 'creating-account' is intentionally NOT a phase — that step happens with
// the FormStepper still mounted (StepperControls shows a loading state) so
// a create-account error returns the user to step 2 with their values intact.
// Only the post-create steps (polling, key creation) cause the wizard to
// swap to the post-form orchestration view.
export type OrchestrationPhase = 'polling' | 'creating-key';

export type OrchestrationState =
  | { kind: 'idle' }
  | { kind: 'running'; phase: OrchestrationPhase; createdAccount?: ServiceAccount }
  | {
      kind: 'partial-failure';
      createdAccount: ServiceAccount;
      key: KeyValues;
      email: string;
      error: string;
    }
  | {
      kind: 'poller-failure';
      createdAccount: ServiceAccount;
      key: KeyValues;
      error: string;
    };

export interface UseWizardOrchestrationOptions {
  projectId: string;
  useCase?: UseCase;
  /** Fired exactly once after a successful key creation. Wizard uses this to navigate + close. */
  onSuccess: (account: ServiceAccount, keyResponse: CreateServiceAccountKeyResponse) => void;
  /**
   * Fired when account creation itself fails. Lets the wizard surface the error
   * back inside the form (step-2) instead of advancing to an orchestration view.
   */
  onAccountCreateError: (message: string) => void;
}

export interface UseWizardOrchestrationResult {
  state: OrchestrationState;
  /** True while the wizard is in any non-idle phase — used to gate dialog close. */
  isRunning: boolean;
  /** Kick off the full sequence from form-submit. */
  start: (data: FormData) => Promise<void>;
  /** Recover from a partial-failure (account + email exist; key creation failed). */
  retryKey: () => Promise<void>;
  /** Recover from a poller-failure (account exists; email never resolved). */
  retryPolling: () => Promise<void>;
  /** Cancel the in-flight long-poll. Account, if created, persists in K8s. */
  abort: () => void;
  /** Force back to idle. Used when the wizard fully closes. */
  reset: () => void;
}

export function useWizardOrchestration({
  projectId,
  useCase,
  onSuccess,
  onAccountCreateError,
}: UseWizardOrchestrationOptions): UseWizardOrchestrationResult {
  const [state, setState] = useState<OrchestrationState>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);
  // Guards a fast double-submit from triggering two parallel runs.
  const runningRef = useRef(false);

  const service = useMemo(() => createServiceAccountService(), []);

  // Best-effort cancellation on unmount. The HTTP POSTs themselves don't accept
  // an AbortSignal, but the long-poll does — and that's the only step where
  // hanging on after unmount actually matters.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    runningRef.current = false;
    setState({ kind: 'idle' });
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const runKeyCreation = useCallback(
    async (account: ServiceAccount, email: string, key: KeyValues) => {
      setState({ kind: 'running', phase: 'creating-key', createdAccount: account });
      try {
        const keyResponse = await service.createKey(projectId, email, {
          name: key.name,
          type: key.type,
          publicKey: key.publicKey,
          expiresAt: key.expiresAt,
        });
        // Intentionally NOT transitioning to `idle` here. onSuccess closes the
        // dialog + navigates away; flipping back to idle would re-render the
        // FormStepper inside the closing dialog (visible flash during the
        // close animation). The component unmounts on navigation, so any
        // stale state is discarded with the unmount.
        onSuccess(account, keyResponse);
      } catch (err) {
        setState({
          kind: 'partial-failure',
          createdAccount: account,
          key,
          email,
          error: err instanceof Error ? err.message : 'Key creation failed.',
        });
      } finally {
        runningRef.current = false;
      }
    },
    [projectId, service, onSuccess]
  );

  const runPolling = useCallback(
    async (account: ServiceAccount, key: KeyValues) => {
      setState({ kind: 'running', phase: 'polling', createdAccount: account });
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const email = await pollForEmail(projectId, account.name, controller.signal);
        if (controller.signal.aborted) {
          runningRef.current = false;
          return;
        }
        await runKeyCreation(account, email, key);
      } catch (err) {
        if (controller.signal.aborted) {
          runningRef.current = false;
          return;
        }
        setState({
          kind: 'poller-failure',
          createdAccount: account,
          key,
          error: err instanceof Error ? err.message : 'Identity setup failed.',
        });
        runningRef.current = false;
      }
    },
    [projectId, runKeyCreation]
  );

  const start = useCallback(
    async (data: FormData) => {
      if (runningRef.current) return;
      runningRef.current = true;

      // Stay in `idle` state during the account-create call. The wizard
      // parent renders the FormStepper for `state.kind === 'idle'` and
      // shows StepperControls in a loading state during the await — so a
      // create-account error keeps the user on the step they submitted
      // from with all field values preserved.
      let newAccount: ServiceAccount;
      try {
        newAccount = await service.create(projectId, {
          name: data.account.name,
          displayName: data.account.displayName,
          useCase,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create service account.';
        runningRef.current = false;
        onAccountCreateError(message);
        return;
      }

      // Account created successfully — transition out of idle. runPolling
      // sets `state.kind = 'running'` immediately, swapping the dialog to
      // the post-form orchestration view.
      await runPolling(newAccount, data.key);
    },
    [projectId, service, useCase, runPolling, onAccountCreateError]
  );

  const retryKey = useCallback(async () => {
    if (state.kind !== 'partial-failure') return;
    if (runningRef.current) return;
    runningRef.current = true;
    await runKeyCreation(state.createdAccount, state.email, state.key);
  }, [state, runKeyCreation]);

  const retryPolling = useCallback(async () => {
    if (state.kind !== 'poller-failure') return;
    if (runningRef.current) return;
    runningRef.current = true;
    await runPolling(state.createdAccount, state.key);
  }, [state, runPolling]);

  return {
    state,
    isRunning: state.kind === 'running',
    start,
    retryKey,
    retryPolling,
    abort,
    reset,
  };
}
