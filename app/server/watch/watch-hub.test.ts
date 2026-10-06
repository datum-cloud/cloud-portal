import {
  HEARTBEAT_INTERVAL_MS,
  OWNER_REFRESH_MS,
  SSE_IDLE_TIMEOUT_MS,
  UPSTREAM_BACKOFF_RETRY_MS,
  UPSTREAM_HEALTHY_AFTER_MS,
  WatchHub,
  type WatchHub as WatchHubType,
} from './watch-hub';
import type { WatchClient, WatchSubscribeRequest } from './watch-hub.types';
import { buildWatchUpstreamPath } from '@/modules/watch/watch-path';
import { env as loadedEnv } from '@/utils/env/env.server';
import { afterEach, beforeEach, describe, expect, it, jest, mock, spyOn } from 'bun:test';

// Other test files replace this module with stubs that have no `public` block,
// and Bun keeps module mocks across files. subscribe() builds the upstream URL
// from env.public.apiUrl, so keep whatever env is loaded and make sure it is set.
mock.module('@/utils/env/env.server', () => ({
  env: {
    ...loadedEnv,
    public: { ...loadedEnv?.public, apiUrl: loadedEnv?.public?.apiUrl ?? 'https://api.test.local' },
  },
}));

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
  let hub: WatchHubType | null = null;

  afterEach(() => {
    hub?.shutdown();
    hub = null;
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
    const intervalSpy = spyOn(globalThis, 'setInterval');

    hub = new WatchHub();
    const { writes, accepted } = registerFakeClient(hub, 'client-1');

    expect(accepted).toBe('accepted');
    // registerClient sends `connected` immediately; ignore it and watch for
    // what arrives afterwards purely from the heartbeat.
    const afterConnect = writes.length;

    const heartbeatCall = intervalSpy.mock.calls.find(([, ms]) => ms === HEARTBEAT_INTERVAL_MS);
    expect(heartbeatCall).toBeDefined();
    expect(heartbeatCall![1]).toBeLessThan(SSE_IDLE_TIMEOUT_MS);

    const tickHeartbeat = heartbeatCall![0];
    expect(typeof tickHeartbeat).toBe('function');
    (tickHeartbeat as () => void)();

    const heartbeats = writes.slice(afterConnect).filter((w) => w.event === 'heartbeat');
    expect(heartbeats.length).toBeGreaterThan(0);

    intervalSpy.mockRestore();
  });
});

describe('buildWatchUpstreamPath', () => {
  const namespacedProxy: WatchSubscribeRequest = {
    clientId: '00000000-0000-0000-0000-000000000001',
    resourceType: 'apis/networking.datumapis.com/v1alpha/httpproxies',
    projectId: 'project-22w58',
    namespace: 'default',
  };

  it('keeps namespaced project resources under /namespaces/{ns}', () => {
    expect(buildWatchUpstreamPath(namespacedProxy)).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/projects/project-22w58/control-plane/apis/networking.datumapis.com/v1alpha/namespaces/default/httpproxies'
    );
  });

  it('omits /namespaces for cluster-scoped project resources', () => {
    expect(
      buildWatchUpstreamPath({
        resourceType: 'apis/locations.miloapis.com/v1alpha1/locations',
        projectId: 'project-22w58',
      })
    ).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/projects/project-22w58/control-plane/apis/locations.miloapis.com/v1alpha1/locations'
    );
  });

  it('keeps a non-default project namespace (allowance buckets)', () => {
    expect(
      buildWatchUpstreamPath({
        resourceType: 'apis/quota.miloapis.com/v1alpha1/allowancebuckets',
        projectId: 'project-22w58',
        namespace: 'milo-system',
      })
    ).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/projects/project-22w58/control-plane/apis/quota.miloapis.com/v1alpha1/namespaces/milo-system/allowancebuckets'
    );
  });

  it('omits /namespaces for cluster-scoped org resources', () => {
    expect(
      buildWatchUpstreamPath({
        resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects',
        orgId: 'org-1',
      })
    ).toBe(
      '/apis/resourcemanager.miloapis.com/v1alpha1/organizations/org-1/control-plane/apis/resourcemanager.miloapis.com/v1alpha1/projects'
    );
  });
});

// ─── Upstream harness ────────────────────────────────

const CLIENT_A = '00000000-0000-0000-0000-00000000000a';
const CLIENT_B = '00000000-0000-0000-0000-00000000000b';

const domainsReq = (clientId: string): WatchSubscribeRequest => ({
  clientId,
  resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
  projectId: 'project-1',
  namespace: 'default',
});

/** One upstream fetch the test can feed lines into, end, or fail. */
interface FakeUpstream {
  url: string;
  token: string | null;
  push: (line: object) => void;
  end: () => void;
}

/**
 * Replaces `fetch` with a stub whose next responses the test queues. A queued
 * status other than 200 returns that status with no stream; otherwise the
 * body is a stream the test controls through the returned {@link FakeUpstream}.
 * A queued hook runs when its fetch is made, before the response is read.
 */
function mockUpstreamFetch() {
  const calls: FakeUpstream[] = [];
  const statuses: number[] = [];
  const hooks: Array<() => void> = [];
  const encoder = new TextEncoder();
  const spy = spyOn(globalThis, 'fetch').mockImplementation(((
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    const url = String(input);
    const token = new Headers(init?.headers).get('Authorization');
    hooks.shift()?.();
    const status = statuses.shift() ?? 200;
    if (status !== 200) {
      calls.push({ url, token, push: () => {}, end: () => {} });
      return Promise.resolve(new Response('nope', { status }));
    }
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start: (c) => {
        controller = c;
      },
    });
    init?.signal?.addEventListener('abort', () => {
      try {
        controller.error(new DOMException('Aborted', 'AbortError'));
      } catch {
        // already closed
      }
    });
    calls.push({
      url,
      token,
      push: (line) => controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`)),
      end: () => controller.close(),
    });
    return Promise.resolve(new Response(body, { status: 200 }));
  }) as typeof fetch);
  return { calls, statuses, hooks, restore: () => spy.mockRestore() };
}

/** Let pending fetch promises and stream reads settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

function registerClient(hub: WatchHubType, id: string, userId = 'user-1', token = 'token-1') {
  const { writes, stream } = createFakeStream();
  const result = hub.registerClient({
    id,
    userId,
    stream,
    subscriptions: new Set(),
    token,
    lastActivity: Date.now(),
  } as unknown as WatchClient);
  return { writes, stream, result };
}

describe('WatchHub upstream lifecycle', () => {
  let hub: WatchHubType;
  let upstream: ReturnType<typeof mockUpstreamFetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    upstream = mockUpstreamFetch();
    hub = new WatchHub();
  });

  afterEach(() => {
    hub.shutdown();
    upstream.restore();
    jest.useRealTimers();
  });

  it('an upstream that ends during the grace window with no subscribers is closed', async () => {
    registerClient(hub, CLIENT_A);
    const channel = await hub.subscribe(domainsReq(CLIENT_A));
    await flush();
    hub.unsubscribe(CLIENT_A, channel);

    upstream.calls[0].end();
    await flush();

    expect(hub.getStats().upstreams).toBe(0);
  });

  it('resubscribing after that starts a new upstream fetch', async () => {
    registerClient(hub, CLIENT_A);
    const channel = await hub.subscribe(domainsReq(CLIENT_A));
    await flush();
    hub.unsubscribe(CLIENT_A, channel);
    upstream.calls[0].end();
    await flush();

    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();

    expect(upstream.calls).toHaveLength(2);
    expect(hub.getStats().upstreams).toBe(1);
  });

  it('a subscribe whose upstream URL cannot be built leaves no subscription behind', async () => {
    // A user-scoped watch needs the user ID in its path.
    registerClient(hub, CLIENT_A, '');

    await expect(hub.subscribe({ ...domainsReq(CLIENT_A), userScoped: true })).rejects.toThrow(
      'userId required'
    );

    expect(hub.getStats()).toEqual({ clients: 1, upstreams: 0, subscriptions: {} });
    expect(upstream.calls).toHaveLength(0);
  });

  it('subscribe restarts an upstream in backoff immediately', async () => {
    registerClient(hub, CLIENT_A);
    registerClient(hub, CLIENT_B);
    upstream.statuses.push(500, 500, 500, 500, 500, 500);
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(16_000);
      await flush();
    }
    const failedCalls = upstream.calls.length;
    expect(failedCalls).toBe(6);

    await hub.subscribe(domainsReq(CLIENT_B));
    await flush();

    expect(upstream.calls.length).toBe(failedCalls + 1);
  });

  it('after five failures the upstream stays in backoff and retries every 30s while subscribed', async () => {
    registerClient(hub, CLIENT_A);
    upstream.statuses.push(...Array(8).fill(500));
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(16_000);
      await flush();
    }
    expect(upstream.calls).toHaveLength(6);
    expect(hub.getStats().upstreams).toBe(1);

    jest.advanceTimersByTime(UPSTREAM_BACKOFF_RETRY_MS - 1);
    await flush();
    expect(upstream.calls).toHaveLength(6);

    jest.advanceTimersByTime(1);
    await flush();
    expect(upstream.calls).toHaveLength(7);

    jest.advanceTimersByTime(UPSTREAM_BACKOFF_RETRY_MS);
    await flush();
    expect(upstream.calls).toHaveLength(8);
    expect(hub.getStats().upstreams).toBe(1);
  });

  it('an orphan reconnect timer cannot close the live upstream for the same key', async () => {
    registerClient(hub, CLIENT_A);
    // Five failures leave a 16s reconnect timer pending, longer than the grace period.
    upstream.statuses.push(500, 500, 500, 500, 500);
    const channel = await hub.subscribe(domainsReq(CLIENT_A));
    await flush();
    for (const ms of [1_000, 2_000, 4_000, 8_000]) {
      jest.advanceTimersByTime(ms);
      await flush();
    }
    expect(upstream.calls).toHaveLength(5);

    // The client leaves and the grace period closes that upstream.
    hub.unsubscribe(CLIENT_A, channel);
    jest.advanceTimersByTime(10_000);
    await flush();
    expect(hub.getStats().upstreams).toBe(0);

    // A new subscribe starts a fresh upstream for the same key.
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();
    expect(upstream.calls).toHaveLength(6);

    // The old upstream's timer comes due and must not touch the new one.
    jest.advanceTimersByTime(6_000);
    await flush();

    expect(upstream.calls).toHaveLength(6);
    expect(hub.getStats().upstreams).toBe(1);
  });

  it('a stream that ends right after an ERROR backs off instead of reconnecting every second', async () => {
    registerClient(hub, CLIENT_A);
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();

    const failOnce = async () => {
      const call = upstream.calls[upstream.calls.length - 1];
      call.push({ type: 'ERROR', object: { code: 500, reason: 'InternalError' } });
      call.end();
      await flush();
    };

    // Each ERROR-then-end waits twice as long as the one before: 1s, 2s, 4s.
    for (const delay of [1_000, 2_000, 4_000]) {
      await failOnce();
      const before = upstream.calls.length;
      jest.advanceTimersByTime(delay - 1);
      await flush();
      expect(upstream.calls).toHaveLength(before);
      jest.advanceTimersByTime(1);
      await flush();
      expect(upstream.calls).toHaveLength(before + 1);
    }
  });

  it('a stream that stays up past the healthy window resets the backoff', async () => {
    registerClient(hub, CLIENT_A);
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();
    for (const delay of [1_000, 2_000]) {
      const call = upstream.calls[upstream.calls.length - 1];
      call.push({ type: 'ERROR', object: { code: 500 } });
      call.end();
      await flush();
      jest.advanceTimersByTime(delay);
      await flush();
    }
    expect(upstream.calls).toHaveLength(3);

    jest.advanceTimersByTime(UPSTREAM_HEALTHY_AFTER_MS);
    await flush();
    const call = upstream.calls[2];
    call.push({ type: 'ERROR', object: { code: 500 } });
    call.end();
    await flush();
    jest.advanceTimersByTime(1_000);
    await flush();

    expect(upstream.calls).toHaveLength(4);
  });

  it('the upstream URL has exactly one timeoutSeconds', async () => {
    registerClient(hub, CLIENT_A);
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();

    const url = new URL(upstream.calls[0].url);
    expect(url.searchParams.getAll('timeoutSeconds')).toHaveLength(1);
    expect(url.searchParams.getAll('watch')).toEqual(['true']);
  });
});

const events = (writes: Array<{ event?: string; data?: string }>, name: string) =>
  writes.filter((w) => w.event === name).map((w) => JSON.parse(w.data ?? '{}'));

/** The channel name `WatchManager.buildChannelKey` produces for {@link domainsReq}. */
const DOMAINS_CHANNEL = 'apis/networking.datumapis.com/v1alpha/domains::project-1:default::::';

describe('WatchHub resync events', () => {
  let hub: WatchHubType;
  let upstream: ReturnType<typeof mockUpstreamFetch>;

  beforeEach(() => {
    jest.useFakeTimers();
    upstream = mockUpstreamFetch();
    hub = new WatchHub();
  });

  afterEach(() => {
    hub.shutdown();
    upstream.restore();
    jest.useRealTimers();
  });

  it('joining a streaming upstream sends resync joined to that client only', async () => {
    const a = registerClient(hub, CLIENT_A);
    const b = registerClient(hub, CLIENT_B);
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();

    await hub.subscribe(domainsReq(CLIENT_B));
    await flush();

    expect(upstream.calls).toHaveLength(1);
    expect(events(b.writes, 'resync')).toEqual([{ channel: DOMAINS_CHANNEL, reason: 'joined' }]);
    expect(events(a.writes, 'resync')).toEqual([]);
  });

  it('a 410 sends resync expired after restarting at rv 0', async () => {
    const a = registerClient(hub, CLIENT_A);
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();
    upstream.calls[0].push({
      type: 'ADDED',
      object: { metadata: { name: 'd1', resourceVersion: '42' } },
    });
    upstream.calls[0].push({ type: 'ERROR', object: { code: 410, reason: 'Expired' } });
    await flush();
    expect(events(a.writes, 'resync')).toEqual([]);

    jest.advanceTimersByTime(100);
    await flush();

    expect(new URL(upstream.calls[1].url).searchParams.get('resourceVersion')).toBe('0');
    expect(events(a.writes, 'resync')).toEqual([{ channel: DOMAINS_CHANNEL, reason: 'expired' }]);
  });

  it('an upstream that keeps expiring falls back to backoff instead of looping', async () => {
    const a = registerClient(hub, CLIENT_A);
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();

    // Every restart streams and expires again at once.
    for (let pushed = 0; pushed < upstream.calls.length && pushed < 10; pushed++) {
      upstream.calls[pushed].push({ type: 'ERROR', object: { code: 410, reason: 'Expired' } });
      await flush();
      jest.advanceTimersByTime(100);
      await flush();
    }

    // Five fast restarts, then the slow backoff retry.
    expect(upstream.calls).toHaveLength(6);
    expect(events(a.writes, 'resync').at(-1)).toEqual({
      channel: DOMAINS_CHANNEL,
      reason: 'degraded',
      degraded: true,
    });
  });

  it('entering backoff sends resync degraded once, and recovery sends resync recovered', async () => {
    const a = registerClient(hub, CLIENT_A);
    upstream.statuses.push(...Array(7).fill(500));
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(16_000);
      await flush();
    }
    expect(events(a.writes, 'resync')).toEqual([
      { channel: DOMAINS_CHANNEL, reason: 'degraded', degraded: true },
    ]);

    // Still failing: no second `degraded`.
    jest.advanceTimersByTime(UPSTREAM_BACKOFF_RETRY_MS);
    await flush();
    expect(upstream.calls).toHaveLength(7);
    expect(events(a.writes, 'resync')).toHaveLength(1);

    jest.advanceTimersByTime(UPSTREAM_BACKOFF_RETRY_MS);
    await flush();
    expect(events(a.writes, 'resync')).toEqual([
      { channel: DOMAINS_CHANNEL, reason: 'degraded', degraded: true },
      { channel: DOMAINS_CHANNEL, reason: 'recovered' },
    ]);
  });

  it('a client joining an upstream in backoff gets resync degraded', async () => {
    registerClient(hub, CLIENT_A);
    const b = registerClient(hub, CLIENT_B);
    upstream.statuses.push(...Array(7).fill(500));
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(16_000);
      await flush();
    }

    await hub.subscribe(domainsReq(CLIENT_B));
    await flush();

    expect(events(b.writes, 'resync')).toEqual([
      { channel: DOMAINS_CHANNEL, reason: 'degraded', degraded: true },
    ]);
  });

  it('401 retries once with a refreshed token', async () => {
    const a = registerClient(hub, CLIENT_A);
    upstream.statuses.push(401);
    upstream.hooks.push(() => hub.updateTokensByUserId('user-1', 'token-2'));
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();

    expect(upstream.calls.map((c) => c.token)).toEqual(['Bearer token-1', 'Bearer token-2']);
    expect(events(a.writes, 'resync')).toEqual([]);
    expect(hub.getStats().upstreams).toBe(1);
  });

  it('401 with the same token sends resync auth once and closes', async () => {
    const a = registerClient(hub, CLIENT_A);
    upstream.statuses.push(401);
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();

    expect(events(a.writes, 'resync')).toEqual([{ channel: DOMAINS_CHANNEL, reason: 'auth' }]);
    expect(hub.getStats().upstreams).toBe(0);

    jest.advanceTimersByTime(60_000);
    await flush();
    expect(upstream.calls).toHaveLength(1);
    expect(events(a.writes, 'resync')).toHaveLength(1);
  });

  it('closing on 401 also drops the subscriptions to that upstream', async () => {
    registerClient(hub, CLIENT_A);
    registerClient(hub, CLIENT_B);
    await hub.subscribe(domainsReq(CLIENT_A));
    await hub.subscribe(domainsReq(CLIENT_B));
    await flush();
    upstream.statuses.push(401);
    upstream.calls[0].end();
    await flush();
    jest.advanceTimersByTime(1000);
    await flush();

    expect(hub.getStats()).toEqual({ clients: 2, upstreams: 0, subscriptions: {} });
  });

  it('a refreshed token that also gets 401 sends resync auth once and closes', async () => {
    const a = registerClient(hub, CLIENT_A);
    upstream.statuses.push(401, 401);
    upstream.hooks.push(() => hub.updateTokensByUserId('user-1', 'token-2'));
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();

    expect(upstream.calls).toHaveLength(2);
    expect(events(a.writes, 'resync')).toEqual([{ channel: DOMAINS_CHANNEL, reason: 'auth' }]);
    expect(hub.getStats().upstreams).toBe(0);
  });

  it('403 enters backoff and never sends resync auth', async () => {
    const a = registerClient(hub, CLIENT_A);
    upstream.statuses.push(403, 403);
    await hub.subscribe(domainsReq(CLIENT_A));
    await flush();

    expect(events(a.writes, 'resync')).toEqual([
      { channel: DOMAINS_CHANNEL, reason: 'degraded', degraded: true },
    ]);
    expect(hub.getStats().upstreams).toBe(1);

    jest.advanceTimersByTime(UPSTREAM_BACKOFF_RETRY_MS - 1);
    await flush();
    expect(upstream.calls).toHaveLength(1);

    jest.advanceTimersByTime(1);
    await flush();
    expect(upstream.calls).toHaveLength(2);

    jest.advanceTimersByTime(UPSTREAM_BACKOFF_RETRY_MS);
    await flush();
    expect(upstream.calls).toHaveLength(3);
    expect(events(a.writes, 'resync')).toEqual([
      { channel: DOMAINS_CHANNEL, reason: 'degraded', degraded: true },
      { channel: DOMAINS_CHANNEL, reason: 'recovered' },
    ]);
  });

  it('two users on the same channel get separate upstreams with their own tokens', async () => {
    const a = registerClient(hub, CLIENT_A, 'user-1', 'token-1');
    const b = registerClient(hub, CLIENT_B, 'user-2', 'token-2');
    const channelA = await hub.subscribe(domainsReq(CLIENT_A));
    const channelB = await hub.subscribe(domainsReq(CLIENT_B));
    await flush();

    expect(hub.getStats().upstreams).toBe(2);
    expect(upstream.calls.map((c) => c.token)).toEqual(['Bearer token-1', 'Bearer token-2']);

    // Clients keep seeing the channel name they built themselves.
    expect(channelA).toBe(DOMAINS_CHANNEL);
    expect(channelB).toBe(DOMAINS_CHANNEL);
    upstream.calls[1].push({
      type: 'ADDED',
      object: { metadata: { name: 'd1', resourceVersion: '7' } },
    });
    await flush();
    expect(events(a.writes, 'watch')).toEqual([]);
    expect(events(b.writes, 'watch').map((e) => e.channel)).toEqual([DOMAINS_CHANNEL]);
    expect(events(b.writes, 'resync')).toEqual([]);
  });

  it('onAbort from a replaced stream keeps the new client', () => {
    const first = registerClient(hub, CLIENT_A);
    const second = registerClient(hub, CLIENT_A);

    hub.removeClient(CLIENT_A, first.stream as unknown as WatchClient['stream']);
    expect(hub.isClientOwnedBy(CLIENT_A, 'user-1')).toBe(true);

    hub.removeClient(CLIENT_A, second.stream as unknown as WatchClient['stream']);
    expect(hub.isClientOwnedBy(CLIENT_A, 'user-1')).toBe(false);
  });

  it('shutdown writes a reconnect event to every stream', () => {
    const a = registerClient(hub, CLIENT_A);
    const b = registerClient(hub, CLIENT_B, 'user-2', 'token-2');

    hub.shutdown();

    expect(events(a.writes, 'reconnect')).toEqual([{}]);
    expect(events(b.writes, 'reconnect')).toEqual([{}]);
  });

  it('sendSubscribeFailed writes subscribe-failed on that client stream only', () => {
    const a = registerClient(hub, CLIENT_A);
    const b = registerClient(hub, CLIENT_B);

    hub.sendSubscribeFailed(CLIENT_A, DOMAINS_CHANNEL, 'Maximum subscriptions per client exceeded');

    expect(events(a.writes, 'subscribe-failed')).toEqual([
      { channel: DOMAINS_CHANNEL, reason: 'Maximum subscriptions per client exceeded' },
    ]);
    expect(events(b.writes, 'subscribe-failed')).toEqual([]);
  });
});

describe('WatchHub stream ownership', () => {
  let hub: WatchHubType;
  const registry = {
    registerOwner: mock(async (_cid: string, _userId: string) => {}),
    refreshOwners: mock(async (_owners: Iterable<[string, string]>) => {}),
    releaseOwner: mock(async (_cid: string) => {}),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    for (const fn of Object.values(registry)) fn.mockClear();
    hub = new WatchHub();
    hub.setOwnerRegistry(registry);
  });

  afterEach(() => {
    hub.shutdown();
    jest.useRealTimers();
  });

  it('registers the owner when a stream opens and releases it when the stream aborts', () => {
    const a = registerClient(hub, CLIENT_A, 'user-1');
    expect(registry.registerOwner).toHaveBeenCalledWith(CLIENT_A, 'user-1');

    hub.removeClient(CLIENT_A, a.stream as never);
    expect(registry.releaseOwner).toHaveBeenCalledWith(CLIENT_A);
  });

  it('refuses a stream whose id another user holds and keeps theirs', () => {
    const a = registerClient(hub, CLIENT_A, 'user-1');

    const takeover = registerClient(hub, CLIENT_A, 'user-2');

    expect(takeover.result).toBe('conflict');
    expect(takeover.writes).toEqual([]);
    expect(hub.isClientOwnedBy(CLIENT_A, 'user-1')).toBe(true);
    expect(registry.registerOwner).toHaveBeenCalledTimes(1);
    expect(registry.releaseOwner).not.toHaveBeenCalled();
    // The original stream still gets events.
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    expect(a.writes.some((w) => w.event === 'heartbeat')).toBe(true);
  });

  it('releases the owner of a stream it turns away at capacity', () => {
    for (let i = 0; i < 1000; i++) registerClient(hub, `client-${i}`);
    registry.releaseOwner.mockClear();

    const rejected = registerClient(hub, CLIENT_A, 'user-1');

    expect(rejected.result).toBe('full');
    expect(registry.releaseOwner).toHaveBeenCalledWith(CLIENT_A);
  });

  it('a stale abort and a same-id reconnect keep the owner', () => {
    const first = registerClient(hub, CLIENT_A, 'user-1');
    registerClient(hub, CLIENT_A, 'user-1');
    hub.removeClient(CLIENT_A, first.stream as never);

    expect(registry.releaseOwner).not.toHaveBeenCalled();
    expect(registry.registerOwner).toHaveBeenCalledTimes(2);
  });

  it('refreshes every owner from the heartbeat every 20s', () => {
    registerClient(hub, CLIENT_A, 'user-1');
    registerClient(hub, CLIENT_B, 'user-2');

    jest.advanceTimersByTime(OWNER_REFRESH_MS - HEARTBEAT_INTERVAL_MS);
    expect(registry.refreshOwners).not.toHaveBeenCalled();

    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    expect(registry.refreshOwners).toHaveBeenCalledTimes(1);
    expect(Array.from(registry.refreshOwners.mock.calls[0][0])).toEqual([
      [CLIENT_A, 'user-1'],
      [CLIENT_B, 'user-2'],
    ]);
  });

  it('shutdown releases every owner', () => {
    registerClient(hub, CLIENT_A);
    registerClient(hub, CLIENT_B);

    hub.shutdown();

    expect(registry.releaseOwner.mock.calls.map(([cid]) => cid)).toEqual([CLIENT_A, CLIENT_B]);
  });
});
