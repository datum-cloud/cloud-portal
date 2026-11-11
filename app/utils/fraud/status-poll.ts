import { paths } from '@/utils/config/paths.config';
import type { FraudPollResult } from '@/utils/middlewares/fraud-redirect';

/** How often /verifying re-checks. It waits on a machine, which promises "under 30 seconds". */
export const VERIFYING_POLL_MS = 4_000;

interface StatusPollOptions {
  /** One status read. Resolve `null` (or throw) for "no answer this tick, try again". */
  fetchStatus: (signal: AbortSignal) => Promise<FraudPollResult | null>;
  /** Called with every answer. Return true when the result is terminal and polling should end. */
  onResult: (result: FraudPollResult) => boolean;
  /** Delay before the next tick, given how long the poll has been running. */
  delayMs: (elapsedMs: number) => number;
  now?: () => number;
}

/**
 * Polls the fraud status endpoint with at most one request in flight.
 *
 * The next tick is scheduled only after the previous one has settled, so a
 * response slower than the delay cannot stack a second request on top of it
 * the way a setInterval does. The first tick fires immediately. Returns a stop
 * function that cancels the pending timer and aborts any in-flight request.
 */
export function startStatusPoll({
  fetchStatus,
  onResult,
  delayMs,
  now = Date.now,
}: StatusPollOptions): () => void {
  const controller = new AbortController();
  const startedAt = now();
  let stopped = false;
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    if (stopped) return;

    let result: FraudPollResult | null = null;
    try {
      result = await fetchStatus(controller.signal);
    } catch {
      // Network error or abort: say nothing and let the next tick retry.
    }

    if (stopped) return;
    if (result && onResult(result)) {
      stopped = true;
      return;
    }

    timerId = setTimeout(() => void tick(), delayMs(now() - startedAt));
  };

  void tick();

  return () => {
    stopped = true;
    clearTimeout(timerId);
    controller.abort();
  };
}

/** GET the fraud status. A non-2xx response reads as "no answer yet". */
export async function fetchFraudStatus(
  signal: AbortSignal,
  url: string = paths.fraud.statusApi
): Promise<FraudPollResult | null> {
  const response = await fetch(url, { credentials: 'include', signal });
  if (!response.ok) return null;
  return (await response.json()) as FraudPollResult;
}

/**
 * Where /verifying sends the user for a poll result, or null to keep waiting.
 * Only a completed evaluation moves them.
 */
export function resolveVerifyingDestination(result: FraudPollResult): string | null {
  if (result.status !== 'completed') return null;

  if (result.decision === 'REVIEW') return paths.fraud.accountUnderReview;
  if (result.decision === 'DEACTIVATE') return paths.fraud.accountSuspended;
  return result.redirectTo ?? paths.onboarding.account;
}
