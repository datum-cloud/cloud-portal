import { createMachineAccountService, machineAccountKeys } from './machine-account.service';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

export type PollerStatus = 'idle' | 'polling' | 'resolved' | 'timeout' | 'error';

export interface PollerResult {
  status: PollerStatus;
  email: string | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 500;
const MAX_POLLS = 10; // 5 seconds total

export function useMachineAccountEmailPoller(
  projectId: string,
  machineAccountName: string,
  initialEmail: string | undefined
): PollerResult {
  const queryClient = useQueryClient();
  const pollCount = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const [result, setResult] = useState<PollerResult>(() => {
    if (initialEmail) {
      return { status: 'resolved', email: initialEmail, error: null };
    }
    return { status: 'idle', email: null, error: null };
  });

  useEffect(() => {
    // If initialEmail transitions to truthy (external cache update), resolve immediately
    if (initialEmail) {
      setResult({ status: 'resolved', email: initialEmail, error: null });
      return;
    }

    if (!projectId || !machineAccountName) {
      return;
    }

    cancelledRef.current = false;
    pollCount.current = 0;
    setResult({ status: 'polling', email: null, error: null });

    const service = createMachineAccountService();

    async function poll() {
      if (cancelledRef.current) return;

      pollCount.current += 1;

      try {
        const account = await service.get(projectId, machineAccountName);

        if (cancelledRef.current) return;

        if (account.identityEmail) {
          queryClient.setQueryData(
            machineAccountKeys.detail(projectId, machineAccountName),
            account
          );
          setResult({ status: 'resolved', email: account.identityEmail, error: null });
          return;
        }

        if (pollCount.current >= MAX_POLLS) {
          setResult({
            status: 'timeout',
            email: null,
            error:
              'Account provisioning timed out. The identity provider may be unavailable. Try refreshing the page.',
          });
          return;
        }

        // Schedule next poll only after this one completes
        timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelledRef.current) return;
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setResult({ status: 'error', email: null, error: message });
      }
    }

    timeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [projectId, machineAccountName, initialEmail, queryClient]);

  return result;
}
