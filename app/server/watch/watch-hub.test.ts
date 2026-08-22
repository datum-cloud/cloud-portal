import {
  HEARTBEAT_INTERVAL_MS,
  SSE_IDLE_TIMEOUT_MS,
  WatchHub,
  type WatchHub as WatchHubType,
} from './watch-hub';
import type { WatchClient } from './watch-hub.types';
import { afterEach, describe, expect, it, jest } from 'bun:test';

/**
 * Minimal stand-in for Hono's SSE stream. Records every write so a test can
 * assert the hub actually put bytes on the wire, which is the only thing that
 * keeps a streamed response from being closed as idle.
 */
function createFakeStream() {
  const writes: Array<{ event?: string; data?: string }> = [];
  return {
    writes,
    stream: {
      writeSSE: (msg: { event?: string; data?: string }) => {
        writes.push(msg);
        return Promise.resolve();
      },
    },
  };
}

function registerFakeClient(hub: WatchHubType, id: string) {
  const { writes, stream } = createFakeStream();
  const accepted = hub.registerClient({
    id,
    userId: 'user-1',
    stream,
    subscriptions: new Set(),
    token: 'token-1',
    lastActivity: Date.now(),
  } as unknown as WatchClient);
  return { writes, accepted };
}

describe('WatchHub heartbeat', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('beats faster than the runtime closes an idle stream', () => {
    // Regression guard for the e2e failure where `POST /api/watch/subscribe`
    // returned 403. A heartbeat slower than the idle close means the SSE
    // connection is dropped before the first beat, `onAbort` evicts the client,
    // and the next subscribe can't find it.
    //
    // Half the ceiling, not merely under it: an 8000ms beat is comfortably
    // below the 12s close and still dropped the connection at 24s in a live
    // run, so a margin this size is load-bearing rather than decorative.
    expect(HEARTBEAT_INTERVAL_MS).toBeLessThanOrEqual(SSE_IDLE_TIMEOUT_MS / 2);
  });

  it('writes to a connected client before the idle timeout elapses', () => {
    jest.useFakeTimers();

    // Constructed under fake timers so its internal interval is controllable.
    const hub = new WatchHub();
    const { writes, accepted } = registerFakeClient(hub, 'client-1');

    expect(accepted).toBe(true);
    // registerClient sends `connected` immediately; ignore it and watch for
    // what arrives afterwards purely from the heartbeat.
    const afterConnect = writes.length;

    jest.advanceTimersByTime(SSE_IDLE_TIMEOUT_MS - 1);

    const heartbeats = writes.slice(afterConnect).filter((w) => w.event === 'heartbeat');
    expect(heartbeats.length).toBeGreaterThan(0);
  });
});
