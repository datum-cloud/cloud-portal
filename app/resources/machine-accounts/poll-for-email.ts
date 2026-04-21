import { createMachineAccountService } from './machine-account.service';

const POLL_INTERVAL_MS = 500;
const MAX_POLLS = 10;

/**
 * Imperatively polls a machine account until `identityEmail` is populated.
 * Resolves with the email address, or rejects with an error on timeout,
 * network failure, or abort.
 *
 * Uses chained setTimeout (not setInterval) to avoid overlapping requests.
 * Guarantees resolve/reject is called at most once via a settled flag.
 */
export async function pollForEmail(
  projectId: string,
  accountName: string,
  signal: AbortSignal
): Promise<string> {
  const service = createMachineAccountService();

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let pollCount = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function settle(fn: () => void) {
      if (settled) return;
      settled = true;
      fn();
    }

    function cleanup() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      signal.removeEventListener('abort', onAbort);
    }

    function onAbort() {
      cleanup();
      settle(() => reject(new Error('Polling cancelled')));
    }

    signal.addEventListener('abort', onAbort, { once: true });

    if (signal.aborted) {
      onAbort();
      return;
    }

    function scheduleNext() {
      timeoutId = setTimeout(async () => {
        timeoutId = null;
        if (settled) return;

        pollCount += 1;

        try {
          const account = await service.get(projectId, accountName);

          if (settled) return;

          if (account.identityEmail) {
            cleanup();
            settle(() => resolve(account.identityEmail));
            return;
          }

          if (pollCount >= MAX_POLLS) {
            cleanup();
            settle(() =>
              reject(
                new Error(
                  'Account provisioning timed out. The identity email has not been assigned yet.'
                )
              )
            );
            return;
          }

          scheduleNext();
        } catch (error) {
          cleanup();
          settle(() => reject(error instanceof Error ? error : new Error(String(error))));
        }
      }, POLL_INTERVAL_MS);
    }

    scheduleNext();
  });
}
