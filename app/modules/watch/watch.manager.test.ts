import { WatchManager } from './watch.manager';
import { resetRateLimitGate } from '@/modules/rate-limit';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const realFetch = globalThis.fetch;
const rateLimited = () =>
  new Response('{}', {
    status: 429,
    headers: { 'Retry-After': '1', 'X-RateLimit-Class': 'machine' },
  });
const ok = () => new Response('{"success":true}', { status: 200 });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Internals = {
  serverSubscribe(options: unknown, attempt?: number): Promise<void>;
  connect(): Promise<void>;
  reconnectAttempts: number;
  channels: Map<string, unknown>;
  buildChannelKey(options: unknown): string;
};

/** Registers a channel the way subscribe() does, so a retry has someone to retry for. */
function listenTo(manager: Internals, options: { resourceType: string }) {
  manager.channels.set(manager.buildChannelKey(options), {
    subscribers: new Set(),
    watchOptions: options,
  });
}

beforeEach(() => resetRateLimitGate());
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('WatchManager under rate limiting', () => {
  test('subscribe retries once after Retry-After on a 429', async () => {
    const fetchMock = mock(async () => (fetchMock.mock.calls.length === 1 ? rateLimited() : ok()));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const manager = new WatchManager() as unknown as Internals;
    const options = { resourceType: 'projects' };
    listenTo(manager, options);

    await manager.serverSubscribe(options);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await sleep(1_200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('the subscribe retry is skipped once nobody listens to the channel', async () => {
    const fetchMock = mock(async () => rateLimited());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const manager = new WatchManager() as unknown as Internals;

    // Never registered (or already unsubscribed): a retry would open a watch
    // on the server that nothing ever closes.
    await manager.serverSubscribe({ resourceType: 'projects' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await sleep(1_200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('a 429 on the stream reconnects after Retry-After without consuming an attempt', async () => {
    const fetchMock = mock(async () => rateLimited());
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const manager = new WatchManager() as unknown as Internals;

    await manager.connect();
    expect(manager.reconnectAttempts).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await sleep(1_200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(manager.reconnectAttempts).toBe(0);
  });
});
