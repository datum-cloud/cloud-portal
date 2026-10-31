import { REPLAY_OPTIONS, addReplayIntegration, runWhenIdle } from './replay';
import * as Sentry from '@sentry/react-router';
import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test';

const realWindow = globalThis.window;

afterEach(() => {
  globalThis.window = realWindow;
  mock.restore();
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
    const requestIdleCallback = mock(() => 7);
    const cancelIdleCallback = mock(() => {});
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
    const setTimeoutSpy = spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = spyOn(globalThis, 'clearTimeout');
    const task = mock(() => {});

    const cancel = runWhenIdle(task);
    expect(setTimeoutSpy).toHaveBeenCalledWith(task, 2000);

    cancel();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(task).not.toHaveBeenCalled();
  });
});

describe('addReplayIntegration', () => {
  it('does not fetch the replay bundle when Sentry has no DSN', async () => {
    const lazyLoad = spyOn(Sentry, 'lazyLoadIntegration');

    await addReplayIntegration();

    expect(lazyLoad).not.toHaveBeenCalled();
  });
});
