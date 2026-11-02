import { REPLAY_OPTIONS, addReplayIntegration, runWhenIdle, type ReplaySdk } from './replay';
import { afterEach, describe, expect, it, vi } from 'vitest';

const realWindow = globalThis.window;

afterEach(() => {
  globalThis.window = realWindow;
  vi.restoreAllMocks();
});

describe('REPLAY_OPTIONS', () => {
  // Lazy loading must not loosen what replay records. A selector list misses
  // revealed passwords and secrets rendered as plain text, so everything stays
  // masked or blocked by default.
  it('masks all text and inputs and blocks all media', () => {
    expect(REPLAY_OPTIONS).toEqual({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
      block: ['[data-sentry-block]'],
    });
  });
});

describe('runWhenIdle', () => {
  it('schedules on requestIdleCallback with a timeout, and the cleanup cancels it', () => {
    const requestIdleCallback = vi.fn(() => 7);
    const cancelIdleCallback = vi.fn(() => {});
    globalThis.window = { requestIdleCallback, cancelIdleCallback } as unknown as Window &
      typeof globalThis;
    const task = () => {};

    const cancel = runWhenIdle(task);
    expect(requestIdleCallback).toHaveBeenCalledWith(task, { timeout: 5000 });

    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
  });

  it('falls back to a timer where requestIdleCallback is missing', () => {
    globalThis.window = {} as unknown as Window & typeof globalThis;
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const task = vi.fn(() => {});

    const cancel = runWhenIdle(task);
    expect(setTimeoutSpy).toHaveBeenCalledWith(task, 2000);

    cancel();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(task).not.toHaveBeenCalled();
  });
});

describe('addReplayIntegration', () => {
  // A fake SDK: under Vitest's node environment the package resolves to its server build,
  // which has no `lazyLoadIntegration`, so spying on the namespace proves
  // nothing.
  function fakeSdk({ dsn, load }: { dsn: boolean; load?: () => Promise<unknown> }) {
    const integration = { name: 'Replay' };
    const replayIntegration = vi.fn(() => integration);
    const sdk = {
      getClient: vi.fn(() => ({
        getDsn: () => (dsn ? { host: 'o1.ingest.sentry.io' } : undefined),
      })),
      lazyLoadIntegration: vi.fn(load ?? (() => Promise.resolve(replayIntegration))),
      addIntegration: vi.fn(() => {}),
    };
    return { sdk: sdk as unknown as ReplaySdk, calls: sdk, integration, replayIntegration };
  }

  // The module keeps a once-only latch, so the order matters: the no-DSN and
  // failure cases must leave it open for the successful load after them.
  it('does not fetch the replay bundle when Sentry has no DSN', async () => {
    const { sdk, calls } = fakeSdk({ dsn: false });

    await addReplayIntegration(undefined, sdk);

    expect(calls.getClient).toHaveBeenCalled();
    expect(calls.lazyLoadIntegration).not.toHaveBeenCalled();
  });

  it('swallows a blocked CDN, adds nothing, and allows a later retry', async () => {
    const { sdk, calls } = fakeSdk({ dsn: true, load: () => Promise.reject(new Error('blocked')) });

    await expect(addReplayIntegration('nonce-1', sdk)).resolves.toBeUndefined();

    expect(calls.lazyLoadIntegration).toHaveBeenCalledTimes(1);
    expect(calls.addIntegration).not.toHaveBeenCalled();
  });

  it('loads replay with the nonce and the masking options, once', async () => {
    const { sdk, calls, integration, replayIntegration } = fakeSdk({ dsn: true });

    await addReplayIntegration('nonce-1', sdk);
    await addReplayIntegration('nonce-1', sdk);

    expect(calls.lazyLoadIntegration).toHaveBeenCalledTimes(1);
    expect(calls.lazyLoadIntegration).toHaveBeenCalledWith('replayIntegration', 'nonce-1');
    expect(replayIntegration).toHaveBeenCalledWith(REPLAY_OPTIONS);
    expect(calls.addIntegration).toHaveBeenCalledWith(integration);
  });
});
