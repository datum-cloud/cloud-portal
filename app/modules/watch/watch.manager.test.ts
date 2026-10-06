import type { TimerHandle, WatchClock } from './watch-clock';
import { WatchManager, type WatchManagerOptions } from './watch.manager';
import type { ResyncPayload, WatchEvent } from './watch.types';
import { resetRateLimitGate } from '@/modules/rate-limit';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const realFetch = globalThis.fetch;
const rateLimited = () =>
  new Response('{}', {
    status: 429,
    headers: { 'Retry-After': '1', 'X-RateLimit-Class': 'machine' },
  });
const ok = () => new Response('{"success":true}', { status: 200 });

/** Let pending promises (fetches, stream reads) run; real timers are never involved. */
async function flush(rounds = 5): Promise<void> {
  for (let i = 0; i < rounds; i++) await new Promise((resolve) => setImmediate(resolve));
}

/** Flush until `check` holds; fails instead of hanging. */
async function until(check: () => boolean, rounds = 50): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    if (check()) return;
    await flush(1);
  }
  throw new Error('condition never held');
}

/** A clock the test moves by hand. Timers fire only from `advance`. */
function createManualClock() {
  let now = 1_000_000;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();

  const nextDue = (limit: number) => {
    let due: [number, { at: number; fn: () => void }] | undefined;
    for (const entry of timers) {
      if (entry[1].at <= limit && (!due || entry[1].at < due[1].at)) due = entry;
    }
    return due;
  };

  const clock: WatchClock = {
    now: () => now,
    setTimeout(fn, ms) {
      seq += 1;
      timers.set(seq, { at: now + Math.max(0, ms), fn });
      return seq as unknown as TimerHandle;
    },
    clearTimeout(handle) {
      timers.delete(handle as unknown as number);
    },
  };

  return {
    clock,
    /** Fire every timer due within `ms`, in order, letting promises settle after each. */
    async advance(ms: number) {
      // Messages already sent may still schedule timers; let them first.
      await flush();
      const target = now + ms;
      for (let due = nextDue(target); due; due = nextDue(target)) {
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
        await flush();
      }
      now = target;
      await flush();
    },
    /** Move time without firing timers, as when a laptop sleeps. */
    jump(ms: number) {
      now += ms;
    },
  };
}

type ManualClock = ReturnType<typeof createManualClock>;

beforeEach(() => resetRateLimitGate());
afterEach(() => {
  globalThis.fetch = realFetch;
});

// ─── Test hub ──────────────────────────────────────

type StreamEnv = {
  document: EventTarget & { hidden: boolean };
  window: EventTarget;
};

type Internals = {
  connect(): Promise<void>;
  reconnectAttempts: number;
  isConnected: boolean;
  channels: Map<string, unknown>;
};

const encoder = new TextEncoder();

/** A fake WatchHub: every stream fetch gets a body the test can push SSE frames into. */
function createHub() {
  const streams: ReadableStreamDefaultController<Uint8Array>[] = [];
  const calls: string[] = [];
  const state = {
    streamStatus: 200,
    subscribeStatus: 200,
    subscribeQueue: [] as number[],
    /** Leave stream fetches pending until aborted, like a slow server. */
    hangStream: false,
  };

  const hang = (init?: RequestInit) =>
    new Promise<Response>((_, reject) =>
      init?.signal?.addEventListener('abort', () =>
        reject(new DOMException('aborted', 'AbortError'))
      )
    );

  const openStream = (init?: RequestInit) => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        streams.push(controller);
        init?.signal?.addEventListener('abort', () => {
          try {
            controller.error(new DOMException('aborted', 'AbortError'));
          } catch {
            // already closed
          }
        });
      },
    });
    return new Response(body, { status: 200 });
  };

  const fetchMock = mock(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith('/api/watch/stream')) {
      calls.push('stream');
      if (state.hangStream) return hang(init);
      if (state.streamStatus === 429) return rateLimited();
      if (state.streamStatus !== 200) return new Response('', { status: state.streamStatus });
      return openStream(init);
    }
    if (url === '/api/watch/subscribe') {
      calls.push('subscribe');
      const status = state.subscribeQueue.shift() ?? state.subscribeStatus;
      return status === 429 ? rateLimited() : new Response('{}', { status });
    }
    calls.push('unsubscribe');
    return ok();
  });

  const send = (event: string, data: unknown = {}) =>
    streams.at(-1)?.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  const end = () => streams.at(-1)?.close();
  const count = (kind: string) => calls.filter((c) => c === kind).length;

  return { fetchMock, send, end, count, state };
}

function createEnv(): StreamEnv {
  const document = Object.assign(new EventTarget(), { hidden: false });
  return { document, window: new EventTarget() };
}

function setHidden(env: StreamEnv, hidden: boolean) {
  env.document.hidden = hidden;
  env.document.dispatchEvent(new Event('visibilitychange'));
}

const SECRETS = { resourceType: 'secrets', projectId: 'p1' };
const ZONES = { resourceType: 'zones', projectId: 'p1' };

const resyncs = (events: WatchEvent[]) =>
  events.filter((e) => e.type === 'RESYNC').map((e) => (e.object as ResyncPayload).reason);

describe('WatchManager', () => {
  let manager: WatchManager | null = null;

  afterEach(() => {
    manager?.disconnectAll();
    manager = null;
  });

  /** A manager on a manual clock and a fake hub, subscribed to SECRETS and ZONES. */
  async function start(opts: Omit<WatchManagerOptions, 'clock' | 'env'> = {}, streamStatus = 200) {
    const hub = createHub();
    hub.state.streamStatus = streamStatus;
    globalThis.fetch = hub.fetchMock as unknown as typeof fetch;
    const env = createEnv();
    const time: ManualClock = createManualClock();
    const current = new WatchManager({
      autoConnect: true,
      env,
      watchdogMs: 60_000,
      ...opts,
      clock: time.clock,
    });
    manager = current;
    const events: WatchEvent[] = [];
    current.subscribe(SECRETS, (e) => events.push(e));
    current.subscribe(ZONES, (e) => events.push(e));
    await until(() => hub.count('stream') === 1);
    const internals = current as unknown as Internals;
    return { hub, env, events, time, manager: current, internals };
  }

  /** {@link start}, then let the hub register the client. */
  async function connected(opts: Parameters<typeof start>[0] = {}) {
    const started = await start(opts);
    started.hub.send('connected');
    await until(() => started.internals.isConnected);
    const secrets = started.manager.buildChannelKey(SECRETS);
    const zones = started.manager.buildChannelKey(ZONES);
    return { ...started, secrets, zones };
  }

  // ─── Rate limiting ───────────────────────────────

  test('subscribe retries after Retry-After on a 429', async () => {
    const { hub, time } = await start();
    hub.state.subscribeQueue.push(429, 429);
    hub.send('connected');
    await until(() => hub.count('subscribe') === 2);

    await time.advance(999);
    expect(hub.count('subscribe')).toBe(2);
    await time.advance(1);
    expect(hub.count('subscribe')).toBe(4);
  });

  test('a subscribe that gets 429 again keeps retrying after Retry-After', async () => {
    const { hub, time } = await start({ watchdogMs: 600_000 });
    hub.state.subscribeQueue.push(429, 429, 429, 429);
    hub.send('connected');
    await until(() => hub.count('subscribe') === 2);

    await time.advance(1_000);
    expect(hub.count('subscribe')).toBe(4);
    // Retry-After still holds, and the backoff (1s, then 2s) never undercuts it.
    await time.advance(1_999);
    expect(hub.count('subscribe')).toBe(4);
    await time.advance(1);
    expect(hub.count('subscribe')).toBe(6);
    await time.advance(60_000);
    expect(hub.count('subscribe')).toBe(6);
    expect(hub.count('stream')).toBe(1);
  });

  test('subscribes that keep getting 429 reopen the stream', async () => {
    const { hub, time } = await start({ watchdogMs: 600_000 });
    hub.state.subscribeStatus = 429;
    hub.send('connected');
    await until(() => hub.count('subscribe') === 2);

    // Retries after 1, 2, 4 and 8s; the fifth 429 reopens.
    await time.advance(14_999);
    expect(hub.count('stream')).toBe(1);
    await time.advance(1);
    expect(hub.count('stream')).toBe(2);
  });

  test('a 429 retry from an earlier connection is dropped', async () => {
    const { hub, time } = await start({ reconnectBaseMs: 1 });
    hub.state.subscribeQueue.push(429, 429);
    hub.send('connected');
    await until(() => hub.count('subscribe') === 2);

    // The stream drops and comes back before Retry-After: the new
    // connection resubscribes both channels itself.
    hub.end();
    await time.advance(10);
    hub.send('connected');
    await until(() => hub.count('subscribe') === 4);

    await time.advance(5_000);
    expect(hub.count('subscribe')).toBe(4);
  });

  test('the subscribe retry is skipped once nobody listens to the channel', async () => {
    const hub = createHub();
    globalThis.fetch = hub.fetchMock as unknown as typeof fetch;
    const time = createManualClock();
    manager = new WatchManager({ autoConnect: true, env: createEnv(), clock: time.clock });
    const unsubscribe = manager.subscribe(SECRETS, () => {});
    await until(() => hub.count('stream') === 1);
    hub.state.subscribeStatus = 429;
    hub.send('connected');
    await until(() => hub.count('subscribe') === 1);

    // Unsubscribed before Retry-After: a retry would open a watch on the
    // server that nothing ever closes.
    unsubscribe();
    await time.advance(2_000);
    expect(hub.count('subscribe')).toBe(1);
  });

  test('a 429 on the stream reconnects after Retry-After without consuming an attempt', async () => {
    const { hub, time, internals } = await start({}, 429);
    expect(internals.reconnectAttempts).toBe(0);

    await time.advance(999);
    expect(hub.count('stream')).toBe(1);
    await time.advance(1);
    expect(hub.count('stream')).toBe(2);
    expect(internals.reconnectAttempts).toBe(0);
  });

  test('visibility return while rate limited waits for Retry-After', async () => {
    const { hub, env, time } = await start({}, 429);
    hub.state.streamStatus = 200;

    setHidden(env, true);
    setHidden(env, false);
    await time.advance(200);
    expect(hub.count('stream')).toBe(1);

    await time.advance(800);
    expect(hub.count('stream')).toBe(2);
  });

  // ─── Stream lifecycle ────────────────────────────

  test('sends RESYNC with reason reconnect to every channel after the second connected event', async () => {
    const { hub, events, time } = await start({ reconnectBaseMs: 1 });
    hub.send('connected');
    await until(() => hub.count('subscribe') === 2);
    expect(resyncs(events)).toEqual([]);

    hub.end();
    await flush();
    await time.advance(10);
    expect(hub.count('stream')).toBe(2);
    hub.send('connected');

    await until(() => resyncs(events).length === 2);
    expect(resyncs(events)).toEqual(['reconnect', 'reconnect']);
  });

  test('keeps the stream when the tab is hidden for less than the grace period', async () => {
    const { hub, env, time, internals } = await connected({ hiddenGraceMs: 200 });

    setHidden(env, true);
    await time.advance(150);
    setHidden(env, false);
    await time.advance(250);

    expect(hub.count('stream')).toBe(1);
    expect(internals.isConnected).toBe(true);
  });

  test('closes the stream after the grace period and resyncs on return with reason visible', async () => {
    const { hub, env, events, time, internals } = await connected({ hiddenGraceMs: 30 });

    setHidden(env, true);
    await time.advance(30);
    expect(internals.isConnected).toBe(false);
    expect(hub.count('stream')).toBe(1);

    setHidden(env, false);
    await until(() => hub.count('stream') === 2);
    hub.send('connected');

    await until(() => resyncs(events).length === 2);
    expect(resyncs(events)).toEqual(['visible', 'visible']);
  });

  test('reconnects when no message arrives within the watchdog window', async () => {
    const { hub, time } = await connected({ watchdogMs: 50 });

    await time.advance(49);
    expect(hub.count('stream')).toBe(1);
    await time.advance(1);
    expect(hub.count('stream')).toBe(2);
  });

  test('heartbeats keep the watchdog from firing', async () => {
    const { hub, time } = await connected({ watchdogMs: 80 });
    for (let i = 0; i < 5; i++) {
      await time.advance(40);
      hub.send('heartbeat');
      await flush();
    }
    expect(hub.count('stream')).toBe(1);
  });

  test('reconnects immediately on visibility return when the last message is older than the watchdog window', async () => {
    const { hub, env, time } = await connected({ watchdogMs: 10_000, hiddenGraceMs: 60_000 });

    // Laptop sleep: timers froze, so the watchdog never ran.
    setHidden(env, true);
    time.jump(20_000);
    setHidden(env, false);

    await until(() => hub.count('stream') === 2);
  });

  test('keeps retrying after ten failures', async () => {
    const { hub, time } = await start({ reconnectBaseMs: 1 }, 500);
    await time.advance(5 * 60_000);
    expect(hub.count('stream')).toBeGreaterThanOrEqual(12);

    hub.state.streamStatus = 200;
    const failures = hub.count('stream');
    await time.advance(40_000);
    expect(hub.count('stream')).toBeGreaterThan(failures);
  });

  test('reconnects immediately on the online event', async () => {
    const { hub, env } = await start({ reconnectBaseMs: 10_000 }, 500);
    await flush();
    hub.state.streamStatus = 200;

    env.window.dispatchEvent(new Event('online'));

    await until(() => hub.count('stream') === 2);
  });

  test('two concurrent connect calls open one stream', async () => {
    const hub = createHub();
    globalThis.fetch = hub.fetchMock as unknown as typeof fetch;
    manager = new WatchManager({ env: createEnv(), clock: createManualClock().clock });
    const internals = manager as unknown as Internals;

    void internals.connect();
    void internals.connect();
    await flush();

    expect(hub.count('stream')).toBe(1);
  });

  test('visibility return during an in-flight connect does not restart it', async () => {
    const hub = createHub();
    hub.state.hangStream = true;
    globalThis.fetch = hub.fetchMock as unknown as typeof fetch;
    const env = createEnv();
    const time = createManualClock();
    manager = new WatchManager({ autoConnect: true, env, watchdogMs: 1_000, clock: time.clock });
    await until(() => hub.count('stream') === 1);
    await time.advance(500);

    setHidden(env, true);
    setHidden(env, false);
    await flush();

    expect(hub.count('stream')).toBe(1);
  });

  /** A manager whose stream fetches never answer, on a manual clock. */
  async function stalled(opts: Omit<WatchManagerOptions, 'clock' | 'env'> = {}) {
    const hub = createHub();
    hub.state.hangStream = true;
    globalThis.fetch = hub.fetchMock as unknown as typeof fetch;
    const env = createEnv();
    const time = createManualClock();
    manager = new WatchManager({
      autoConnect: true,
      env,
      watchdogMs: 1_000,
      ...opts,
      clock: time.clock,
    });
    await until(() => hub.count('stream') === 1);
    return { hub, env, time };
  }

  test('a connect that gets no headers within the watchdog window is aborted and retried', async () => {
    const crumbs: string[] = [];
    const { hub, time } = await stalled({
      reconnectBaseMs: 1,
      breadcrumb: (message) => crumbs.push(message),
    });

    await time.advance(999);
    expect(hub.count('stream')).toBe(1);
    await time.advance(1);
    await time.advance(10);
    expect(hub.count('stream')).toBe(2);
    expect(crumbs).toContain('watch connect timed out');
  });

  test('visibility return restarts a connect pending longer than the watchdog window', async () => {
    const { hub, env, time } = await stalled();

    // Laptop sleep during the connect: timers froze, so its timeout never ran.
    setHidden(env, true);
    time.jump(2_000);
    setHidden(env, false);

    await until(() => hub.count('stream') === 2);
  });

  test('online restarts a connect pending longer than the watchdog window', async () => {
    const { hub, env, time } = await stalled();

    time.jump(2_000);
    env.window.dispatchEvent(new Event('online'));

    await until(() => hub.count('stream') === 2);
  });

  test('connection state is reconnecting while disconnected and live after connected', async () => {
    const { hub, manager: current } = await start({ reconnectBaseMs: 10_000 });
    const seen: string[] = [];
    const unsubscribe = current.subscribeStatus(() => seen.push(current.getConnectionState()));

    expect(current.getConnectionState()).toBe('reconnecting');
    hub.send('connected');
    await until(() => current.getConnectionState() === 'live');

    hub.end();
    await until(() => current.getConnectionState() === 'reconnecting');
    expect(seen).toEqual(['live', 'reconnecting']);
    unsubscribe();
  });

  // ─── Subscribe failures ──────────────────────────

  test('a 403 or 409 from subscribe reopens the stream and resubscribes', async () => {
    for (const status of [403, 409]) {
      const { hub, events, manager: current } = await start();
      hub.state.subscribeStatus = status;
      hub.send('connected');
      await until(() => hub.count('subscribe') === 2);

      await until(() => hub.count('stream') === 2);
      hub.state.subscribeStatus = 200;
      hub.send('connected');

      await until(() => hub.count('subscribe') === 4);
      await until(() => resyncs(events).length === 2);
      current.disconnectAll();
    }
  });

  test('a 503 on subscribe retries until it succeeds', async () => {
    const { hub, time } = await start({ reconnectBaseMs: 5 });
    // Both channels fail twice, then succeed.
    hub.state.subscribeQueue.push(503, 503, 503, 503);
    hub.send('connected');
    await until(() => hub.count('subscribe') === 2);
    await flush();

    await time.advance(5);
    await time.advance(10);
    expect(hub.count('subscribe')).toBe(6);
    await time.advance(1_000);
    expect(hub.count('subscribe')).toBe(6);
    expect(hub.count('stream')).toBe(1);
  });

  test('five subscribe failures reopen the stream', async () => {
    const { hub, time } = await start({ reconnectBaseMs: 2 });
    hub.state.subscribeStatus = 503;
    hub.send('connected');
    await until(() => hub.count('subscribe') === 2);
    await flush();

    // Retries at 2, 4, 8 and 16ms; the fifth failure reopens.
    for (const ms of [2, 4, 8, 16]) await time.advance(ms);
    expect(hub.count('stream')).toBe(2);
    expect(hub.count('subscribe')).toBeGreaterThanOrEqual(5);
    await time.advance(1_000);
    expect(hub.count('stream')).toBe(2);
  });

  test('a 400 on subscribe is not retried', async () => {
    const { hub, time } = await start({ reconnectBaseMs: 2 });
    hub.state.subscribeStatus = 400;
    hub.send('connected');

    await until(() => hub.count('subscribe') === 2);
    await time.advance(1_000);
    expect(hub.count('subscribe')).toBe(2);
    expect(hub.count('stream')).toBe(1);
  });

  test('202 relayed keeps the channel without reconnecting', async () => {
    const { hub, manager: current, internals, time } = await start({ reconnectBaseMs: 10_000 });
    hub.state.subscribeStatus = 202;
    hub.send('connected');
    await until(() => hub.count('subscribe') === 2);
    await time.advance(1_000);

    expect(hub.count('stream')).toBe(1);
    expect(internals.isConnected).toBe(true);
    expect(internals.channels.has(current.buildChannelKey(SECRETS))).toBe(true);
    expect(internals.channels.has(current.buildChannelKey(ZONES))).toBe(true);
  });

  // ─── Hub events ──────────────────────────────────

  test('ERROR resyncs are throttled per channel', async () => {
    const { hub, events, time, secrets, zones } = await connected({ errorResyncThrottleMs: 100 });
    const errors = () => events.filter((e) => e.type === 'ERROR').length;

    hub.send('watch-error', { channel: secrets, code: 500 });
    hub.send('watch-error', { channel: secrets, code: 500 });
    hub.send('watch-error', { channel: zones, code: 500 });
    await until(() => errors() === 2);
    await flush();
    expect(errors()).toBe(2);

    await time.advance(100);
    hub.send('watch-error', { channel: secrets, code: 500 });
    await until(() => errors() === 3);
  });

  test('a resync SSE event is forwarded as RESYNC to that channel only', async () => {
    const { hub, manager: current, secrets } = await connected();
    const secretEvents: WatchEvent[] = [];
    const zoneEvents: WatchEvent[] = [];
    current.subscribe(SECRETS, (e) => secretEvents.push(e));
    current.subscribe(ZONES, (e) => zoneEvents.push(e));

    hub.send('resync', { channel: secrets, reason: 'expired' });

    await until(() => secretEvents.length === 1);
    expect(secretEvents).toEqual([{ type: 'RESYNC', object: { reason: 'expired' } }]);
    await flush();
    expect(zoneEvents).toEqual([]);
  });

  test('resync degraded sets connection state degraded until resync recovered', async () => {
    const { hub, events, manager: current, secrets } = await connected();
    expect(current.getConnectionState()).toBe('live');

    hub.send('resync', { channel: secrets, reason: 'degraded', degraded: true });
    await until(() => current.getConnectionState() === 'degraded');
    expect(events.at(-1)).toEqual({
      type: 'RESYNC',
      object: { reason: 'degraded', degraded: true },
    });

    hub.send('resync', { channel: secrets, reason: 'recovered' });
    await until(() => current.getConnectionState() === 'live');
    expect(resyncs(events)).toEqual(['degraded', 'recovered']);
  });

  test('resync auth reopens the stream', async () => {
    const { hub, events, secrets, zones } = await connected();

    // Every channel on the upstream's user reports auth; one reopen covers them.
    hub.send('resync', { channel: secrets, reason: 'auth' });
    hub.send('resync', { channel: zones, reason: 'auth' });
    await until(() => hub.count('stream') === 2);
    await flush();
    expect(hub.count('stream')).toBe(2);

    hub.send('connected');
    await until(() => resyncs(events).length === 2);
    expect(resyncs(events)).toEqual(['auth', 'auth']);
  });

  test('repeated resync auth reopens back off', async () => {
    const { hub, secrets, time } = await connected({ reconnectBaseMs: 300 });
    hub.send('resync', { channel: secrets, reason: 'auth' });
    await until(() => hub.count('stream') === 2);
    hub.send('connected');
    await flush();

    // The fresh token was rejected again: the second reopen waits.
    hub.send('resync', { channel: secrets, reason: 'auth' });
    await time.advance(100);
    expect(hub.count('stream')).toBe(2);
    await time.advance(300);
    expect(hub.count('stream')).toBe(3);
  });

  test('a reconnect event reconnects immediately', async () => {
    const { hub } = await connected({ reconnectBaseMs: 10_000 });

    hub.send('reconnect');

    await until(() => hub.count('stream') === 2);
  });

  test('a subscribe-failed event reopens the stream', async () => {
    const { hub, secrets } = await connected({ reconnectBaseMs: 10_000 });

    hub.send('subscribe-failed', { channel: secrets, reason: 'forbidden' });

    await until(() => hub.count('stream') === 2);
  });

  test('a relayed subscribe does not reset the reopen backoff', async () => {
    const { hub, secrets, time } = await connected({ reconnectBaseMs: 300 });
    hub.state.subscribeStatus = 202;

    // The owning pod refused a relayed subscribe: reopen at once.
    hub.send('subscribe-failed', { channel: secrets, reason: 'cap' });
    await until(() => hub.count('stream') === 2);
    hub.send('connected');
    await until(() => hub.count('subscribe') === 4);

    // Relayed again and refused again: a 202 is not proof the subscribe
    // worked, so this reopen backs off instead of looping.
    hub.send('subscribe-failed', { channel: secrets, reason: 'cap' });
    await time.advance(100);
    expect(hub.count('stream')).toBe(2);
    await time.advance(300);
    expect(hub.count('stream')).toBe(3);
  });

  test('a subscribed event from the owning pod clears the reopen backoff', async () => {
    const { hub, secrets } = await connected({ reconnectBaseMs: 10_000 });
    hub.state.subscribeStatus = 202;

    hub.send('subscribe-failed', { channel: secrets, reason: 'cap' });
    await until(() => hub.count('stream') === 2);
    hub.send('connected');
    await until(() => hub.count('subscribe') === 4);
    hub.send('subscribed', { channel: secrets });
    await flush();

    hub.send('subscribe-failed', { channel: secrets, reason: 'cap' });
    await until(() => hub.count('stream') === 3);
  });

  test('a reconnect followed by joined causes one resync per channel', async () => {
    const { hub, events, secrets, zones, time } = await connected({ reconnectBaseMs: 1 });

    hub.end();
    await flush();
    await time.advance(10);
    expect(hub.count('stream')).toBe(2);
    hub.send('connected');
    // The upstreams outlived the gap, so the hub answers each resubscribe with joined.
    hub.send('resync', { channel: secrets, reason: 'joined' });
    hub.send('resync', { channel: zones, reason: 'joined' });
    await until(() => resyncs(events).length >= 2);
    await flush();

    expect(resyncs(events)).toEqual(['reconnect', 'reconnect']);
  });

  test('a joined resync for a channel subscribed mid-connection is forwarded', async () => {
    const { hub, manager: current } = await connected();
    const fresh: WatchEvent[] = [];
    const options = { resourceType: 'domains', projectId: 'p1' };
    current.subscribe(options, (e) => fresh.push(e));

    hub.send('resync', { channel: current.buildChannelKey(options), reason: 'joined' });

    await until(() => fresh.length === 1);
    expect(resyncs(fresh)).toEqual(['joined']);
  });

  test('a throwing subscriber does not stop the others on its channel', async () => {
    const crumbs: { message: string; level?: string }[] = [];
    const {
      hub,
      manager: current,
      secrets,
    } = await connected({
      breadcrumb: (message, _data, level) => crumbs.push({ message, level }),
    });
    const heard: WatchEvent[] = [];
    current.subscribe(SECRETS, () => {
      throw new Error('subscriber bug');
    });
    current.subscribe(SECRETS, (e) => heard.push(e));

    hub.send('watch', { channel: secrets, type: 'ADDED', object: { name: 'a' } });
    hub.send('watch', { channel: secrets, type: 'MODIFIED', object: { name: 'a' } });

    await until(() => heard.length === 2);
    expect(crumbs).toContainEqual({ message: 'watch subscriber threw', level: 'error' });
  });

  test('a throwing subscriber does not stop a reconnect resync of the other channels', async () => {
    const { hub, manager: current, events, time } = await connected({ reconnectBaseMs: 1 });
    // SECRETS is resynced first; its throw must not cost ZONES its resync.
    current.subscribe(SECRETS, (e) => {
      if (e.type === 'RESYNC') throw new Error('subscriber bug');
    });

    hub.end();
    await time.advance(10);
    hub.send('connected');

    await until(() => resyncs(events).length === 2);
    expect(resyncs(events)).toEqual(['reconnect', 'reconnect']);
  });

  test('breadcrumbs record reconnects, watchdog trips and resyncs', async () => {
    const crumbs: string[] = [];
    const { hub, secrets, time } = await connected({
      watchdogMs: 80,
      reconnectBaseMs: 1,
      breadcrumb: (message) => crumbs.push(message),
    });

    hub.send('resync', { channel: secrets, reason: 'expired' });
    await flush();
    await time.advance(80);
    expect(hub.count('stream')).toBe(2);
    hub.send('connected');
    await until(() => crumbs.includes('watch reconnected'));

    expect(crumbs).toContain('watch resync');
    expect(crumbs).toContain('watch watchdog tripped');
  });
});
