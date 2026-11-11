import {
  fetchFraudStatus,
  resolveVerifyingDestination,
  startStatusPoll,
  VERIFYING_POLL_MS,
} from './status-poll';
import { paths } from '@/utils/config/paths.config';
import type { FraudPollResult } from '@/utils/middlewares/fraud-redirect';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const PENDING: FraudPollResult = { status: 'pending', reason: 'fraud-review' };
const ACCEPTED: FraudPollResult = {
  status: 'completed',
  decision: 'ACCEPTED',
  redirectTo: '/onboarding/profile',
};

/** A fetchStatus whose every call resolves `delayMs` later, tracking how many overlap. */
function slowFetch(result: FraudPollResult, delayMs: number) {
  let inFlight = 0;
  let maxInFlight = 0;
  const fetchStatus = vi.fn(async (_signal: AbortSignal) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    inFlight -= 1;
    return result;
  });
  return { fetchStatus, maxInFlight: () => maxInFlight };
}

describe('startStatusPoll', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('never runs two requests at once when a request is slower than the interval', async () => {
    const { fetchStatus, maxInFlight } = slowFetch(PENDING, 10_000);
    const stop = startStatusPoll({
      fetchStatus,
      onResult: () => false,
      delayMs: () => VERIFYING_POLL_MS,
    });

    await vi.advanceTimersByTimeAsync(60_000);
    stop();

    expect(maxInFlight()).toBe(1);
    // Each round is 10s of request plus a 4s wait: starts at 0, 14, 28, 42, 56.
    expect(fetchStatus).toHaveBeenCalledTimes(5);
  });

  it('fires the first request immediately, then waits the delay after each one settles', async () => {
    const fetchStatus = vi.fn(() => Promise.resolve(PENDING));
    const stop = startStatusPoll({ fetchStatus, onResult: () => false, delayMs: () => 4_000 });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchStatus).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3_999);
    expect(fetchStatus).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchStatus).toHaveBeenCalledTimes(2);
    stop();
  });

  it('stops polling once the result is terminal', async () => {
    const fetchStatus = vi
      .fn<(signal: AbortSignal) => Promise<FraudPollResult>>()
      .mockResolvedValueOnce(PENDING)
      .mockResolvedValue(ACCEPTED);
    const onResult = vi.fn((result: FraudPollResult) => result.status === 'completed');

    startStatusPoll({ fetchStatus, onResult, delayMs: () => 4_000 });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(fetchStatus).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenLastCalledWith(ACCEPTED);
  });

  it('keeps polling through errors and empty answers', async () => {
    const fetchStatus = vi
      .fn<(signal: AbortSignal) => Promise<FraudPollResult | null>>()
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(null)
      .mockResolvedValue(ACCEPTED);
    const onResult = vi.fn(() => true);

    startStatusPoll({ fetchStatus, onResult, delayMs: () => 4_000 });
    await vi.advanceTimersByTimeAsync(20_000);

    expect(fetchStatus).toHaveBeenCalledTimes(3);
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it('on stop, aborts the in-flight request and neither reports nor reschedules', async () => {
    const { fetchStatus } = slowFetch(ACCEPTED, 10_000);
    const onResult = vi.fn(() => true);
    const stop = startStatusPoll({ fetchStatus, onResult, delayMs: () => 4_000 });

    await vi.advanceTimersByTimeAsync(1_000);
    const signal = fetchStatus.mock.calls[0][0];
    stop();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(signal.aborted).toBe(true);
    expect(onResult).not.toHaveBeenCalled();
    expect(fetchStatus).toHaveBeenCalledTimes(1);
  });

  it('passes the elapsed time to delayMs so callers can back off', async () => {
    let clock = 0;
    const fetchStatus = vi.fn(() => Promise.resolve(PENDING));
    const delayMs = vi.fn((_elapsedMs: number) => 10_000);
    const stop = startStatusPoll({
      fetchStatus,
      onResult: () => false,
      delayMs,
      now: () => clock,
    });

    await vi.advanceTimersByTimeAsync(0);
    clock = 10_000;
    await vi.advanceTimersByTimeAsync(10_000);
    stop();

    expect(delayMs).toHaveBeenNthCalledWith(1, 0);
    expect(delayMs).toHaveBeenNthCalledWith(2, 10_000);
  });
});

describe('fetchFraudStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the status endpoint with credentials and returns the parsed body', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(PENDING), { status: 200 }))
    );
    vi.stubGlobal('fetch', fetchMock);
    const { signal } = new AbortController();

    await expect(fetchFraudStatus(signal)).resolves.toEqual(PENDING);
    expect(fetchMock).toHaveBeenCalledWith(paths.fraud.statusApi, {
      credentials: 'include',
      signal,
    });
  });

  it('returns null for a non-2xx response so the poll retries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('nope', { status: 502 })))
    );

    await expect(fetchFraudStatus(new AbortController().signal)).resolves.toBeNull();
  });
});

describe('resolveVerifyingDestination', () => {
  it('keeps waiting while the evaluation is pending', () => {
    expect(resolveVerifyingDestination(PENDING)).toBeNull();
    expect(
      resolveVerifyingDestination({ status: 'pending', reason: 'email-unverified' })
    ).toBeNull();
  });

  it('sends a REVIEW decision to the under-review page', () => {
    expect(resolveVerifyingDestination({ status: 'completed', decision: 'REVIEW' })).toBe(
      paths.fraud.accountUnderReview
    );
  });

  it('sends a DEACTIVATE decision to the suspended page', () => {
    expect(resolveVerifyingDestination({ status: 'completed', decision: 'DEACTIVATE' })).toBe(
      paths.fraud.accountSuspended
    );
  });

  it('sends an accepted user to the redirect the server chose', () => {
    expect(resolveVerifyingDestination(ACCEPTED)).toBe('/onboarding/profile');
  });

  it('falls back to account onboarding when an accepted result has no redirect', () => {
    expect(resolveVerifyingDestination({ status: 'completed', decision: 'ACCEPTED' })).toBe(
      paths.onboarding.account
    );
  });
});
