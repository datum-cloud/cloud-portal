import {
  BASE_RECONNECT_DELAY,
  HEARTBEAT_INTERVAL_MS,
  MAX_RECONNECT_ATTEMPTS,
  SSE_IDLE_TIMEOUT_MS,
  WatchAuthorizationError,
  WatchHub,
  type WatchHub as WatchHubType,
} from './watch-hub';
import type {
  UpstreamWatch,
  WatchChannel,
  WatchClient,
  WatchSubscribeRequest,
} from './watch-hub.types';
import { buildWatchChannelKey } from '@/modules/watch/watch.channel-key';
import { env } from '@/utils/env/env.server';
import { afterEach, beforeAll, describe, expect, it, jest } from 'bun:test';

/**
 * `buildUpstreamUrl` (see watch-hub.ts) reads `env.public.apiUrl` to build the
 * upstream K8s watch URL. Locally that value comes from `.env`'s `API_URL`;
 * CI has no `.env`, so this suite must not depend on it — without a value
 * here, `apiUrl` is `undefined` and `new URL()` throws `Invalid URL` for
 * every subscribe/reconnect test.
 *
 * This sets the field directly on the real, shared `env.server` export
 * rather than `mock.module`-replacing the module: `env.server` is imported
 * directly by ~25 other files (cookies, redis, axios, other route modules),
 * and replacing the whole module leaks across files under `bun test
 * --coverage` (confirmed — see the auth suites' own comments on this exact
 * hazard), dropping every field this suite doesn't itself set and breaking
 * unrelated tests. A targeted property assignment only ever adds the one
 * field this suite needs.
 *
 * Doing it in `beforeAll` (not at module scope) matters too: `bun test`
 * finishes loading every test file's module-level code — including any
 * `mock.module` calls elsewhere — before running any test body or hook.
 * `beforeAll` runs after that point, so this assignment is the one that
 * actually sticks for this suite's tests, whatever ran during collection.
 */
beforeAll(() => {
  env.public.apiUrl = 'https://api.watch-hub.test';
});

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

function registerFakeClient(
  hub: WatchHubType,
  id: string,
  identity: { userId?: string; token?: string } = {}
) {
  const { writes, stream } = createFakeStream();
  const accepted = hub.registerClient({
    id,
    userId: identity.userId ?? 'user-1',
    stream,
    subscriptions: new Set(),
    token: identity.token ?? 'token-1',
    lastActivity: Date.now(),
  } as unknown as WatchClient);
  return { writes, accepted };
}

interface StubbedRequest {
  url: string;
  token: string | null;
}

/**
 * Per-token API behaviour. The default models a control plane that serves the
 * watch; the rest are the ways one can say no, including the two that a check
 * reading only the status line would take for a yes.
 */
interface StubApiOptions {
  /** Refused with an HTTP 403. */
  deniedTokens?: string[];
  /** Answered 200 whose body carries an error `Status` — how K8s reports 410. */
  inBandStatusTokens?: string[];
  /** Answered 200 whose body carries an in-band `Status` reporting 410 Gone specifically. */
  goneTokens?: string[];
  /** Answered 200 carrying an ERROR envelope with no status code at all. */
  codelessErrorTokens?: string[];
  /** Answered 200 whose body is a bare K8s `Status`, not a watch envelope. */
  bareStatusTokens?: string[];
  /** Answered 200 that closes at once having sent nothing. */
  emptyCloseTokens?: string[];
  /** Answered 200 that stays open and never emits — an idle authorized watch. */
  idleTokens?: string[];
  /**
   * Answered 200 whose stream rejects the first read instead of closing or
   * going idle — a dropped connection, a TLS reset, a proxy killing the
   * response body mid-stream. Distinct from `idleTokens`: idle means the
   * deadline in `withDeadline` fires; this means the raced read itself does.
   */
  erroringTokens?: string[];
}

const ADDED_EVENT = `${JSON.stringify({
  type: 'ADDED',
  object: { kind: 'Domain', metadata: { name: 'example-com', resourceVersion: '7' } },
})}\n`;

const FORBIDDEN_STATUS = `${JSON.stringify({
  type: 'ERROR',
  object: { kind: 'Status', code: 403, reason: 'Forbidden', message: 'forbidden' },
})}\n`;

/** An ERROR envelope carrying no `code` — refused on the envelope alone. */
const CODELESS_ERROR = `${JSON.stringify({
  type: 'ERROR',
  object: { kind: 'Status', reason: 'Forbidden' },
})}\n`;

/** The ordinary K8s error body: a `Status`, not a `{type, object}` envelope. */
const BARE_STATUS = `${JSON.stringify({ kind: 'Status', code: 403, reason: 'Forbidden' })}\n`;

/**
 * An in-band 410 Gone `Status` — how Kubernetes reports an expired
 * `resourceVersion` on an otherwise-200 watch stream. Same shape as
 * {@link FORBIDDEN_STATUS}, distinguished only by the code/reason the 410
 * recovery path in `pumpUpstream` actually branches on.
 */
const GONE_STATUS = `${JSON.stringify({
  type: 'ERROR',
  object: { kind: 'Status', code: 410, reason: 'Expired', message: 'too old resource version' },
})}\n`;

/**
 * Stand in for the API.
 *
 * The default response serves one event and then stays connected, which is
 * what the hub reads as "the API served this caller". Every other shape — an
 * in-band error, a bare `Status`, an immediate close, an endless silence — is
 * selectable per token, because acceptance is decided from the stream and not
 * from the status line.
 *
 * Records the URL and bearer token of every request, so a test can see whose
 * credentials were presented and against what.
 */
function stubApiFetch(options: StubApiOptions = {}) {
  const requests: StubbedRequest[] = [];
  const live: ReadableStreamDefaultController<Uint8Array>[] = [];
  const denied = new Set(options.deniedTokens ?? []);
  const inBand = new Set(options.inBandStatusTokens ?? []);
  const gone = new Set(options.goneTokens ?? []);
  const codeless = new Set(options.codelessErrorTokens ?? []);
  const bare = new Set(options.bareStatusTokens ?? []);
  const emptyClose = new Set(options.emptyCloseTokens ?? []);
  const idle = new Set(options.idleTokens ?? []);
  const erroring = new Set(options.erroringTokens ?? []);
  const original = globalThis.fetch;
  const encoder = new TextEncoder();

  /** A 200 that emits `lines`, then either closes or stays open for `emit`. */
  const stream = (lines: string[], { close }: { close: boolean }) =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const line of lines) controller.enqueue(encoder.encode(line));
          if (close) controller.close();
          else live.push(controller);
        },
      })
    );

  /** A 200 whose stream rejects the first read rather than closing or idling. */
  const erroringStream = () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.error(new Error('connection reset'));
        },
      })
    );

  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const token = new Headers(init?.headers).get('Authorization')?.replace('Bearer ', '') ?? null;
    requests.push({ url, token });

    if (token && denied.has(token)) {
      return Promise.resolve(new Response('forbidden', { status: 403 }));
    }
    if (token && inBand.has(token))
      return Promise.resolve(stream([FORBIDDEN_STATUS], { close: true }));
    if (token && gone.has(token)) return Promise.resolve(stream([GONE_STATUS], { close: true }));
    if (token && codeless.has(token))
      return Promise.resolve(stream([CODELESS_ERROR], { close: true }));
    if (token && bare.has(token)) return Promise.resolve(stream([BARE_STATUS], { close: true }));
    if (token && emptyClose.has(token)) return Promise.resolve(stream([], { close: true }));
    if (token && idle.has(token)) return Promise.resolve(stream([], { close: false }));
    if (token && erroring.has(token)) return Promise.resolve(erroringStream());

    return Promise.resolve(stream([ADDED_EVENT], { close: false }));
  }) as typeof globalThis.fetch;

  return {
    requests,
    /** The bearer token of every request the API saw, in order. */
    tokens: () => requests.map((r) => r.token),
    /** Push a watch event into every open stream. */
    emit: (line = ADDED_EVENT) => {
      for (const controller of live) controller.enqueue(encoder.encode(line));
    },
    restore: () => void (globalThis.fetch = original),
  };
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

    expect(accepted).toBe('accepted');
    // registerClient sends `connected` immediately; ignore it and watch for
    // what arrives afterwards purely from the heartbeat.
    const afterConnect = writes.length;

    jest.advanceTimersByTime(SSE_IDLE_TIMEOUT_MS - 1);

    const heartbeats = writes.slice(afterConnect).filter((w) => w.event === 'heartbeat');
    expect(heartbeats.length).toBeGreaterThan(0);
  });
});

describe('WatchHub user-scoped channels', () => {
  const USER_INVITATIONS = 'apis/iam.miloapis.com/v1alpha1/userinvitations';

  it('announces the session user id in the connected handshake', () => {
    // The browser cannot derive a user-scoped channel key without it.
    const hub = new WatchHub();
    const { writes } = registerFakeClient(hub, 'client-1', { userId: 'user-a' });
    hub.shutdown();

    const connected = writes.find((w) => w.event === 'connected');
    expect(connected).toBeDefined();
    expect(JSON.parse(connected!.data!)).toEqual({ clientId: 'client-1', userId: 'user-a' });
  });

  it('puts two users on separate channels for the same user-scoped watch', async () => {
    const { requests, restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      const channelA = await hub.subscribe({
        clientId: 'client-a',
        resourceType: USER_INVITATIONS,
        userScoped: true,
      });
      const channelB = await hub.subscribe({
        clientId: 'client-b',
        resourceType: USER_INVITATIONS,
        userScoped: true,
      });

      expect(channelA).not.toBe(channelB);

      // Separate channels mean separate upstreams, each opened against its
      // own user's control plane — nobody reads anybody else's invitations.
      const stats = hub.getStats();
      expect(stats.upstreams).toBe(2);
      expect(Object.keys(stats.subscriptions).sort()).toEqual([channelA, channelB].sort());

      const opened = requests.map((r) => r.url);
      expect(opened.some((u) => u.includes('/users/user-a/'))).toBe(true);
      expect(opened.some((u) => u.includes('/users/user-b/'))).toBe(true);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('still shares one upstream when two users watch the same project', async () => {
    // The whole point of the hub. Scoping user-scoped channels per user must
    // not cost the multiplexing everything else relies on.
    const { restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      const request = {
        resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
        projectId: 'project-1',
        namespace: 'default',
      };
      const channelA = await hub.subscribe({ clientId: 'client-a', ...request });
      const channelB = await hub.subscribe({ clientId: 'client-b', ...request });

      expect(channelA).toBe(channelB);
      expect(hub.getStats().upstreams).toBe(1);
      expect(hub.getStats().subscriptions[channelA]).toBe(2);
    } finally {
      hub.shutdown();
      restore();
    }
  });
});

const DOMAINS = {
  resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
  projectId: 'project-1',
  namespace: 'default',
};

/** Watch-control params the probe is expected to differ on, and only these. */
const WATCH_CONTROL_PARAMS = ['watch', 'timeoutSeconds', 'resourceVersion', 'allowWatchBookmarks'];

function addressableIdentity(rawUrl: string) {
  const url = new URL(rawUrl);
  const params = new URLSearchParams(url.searchParams);
  for (const param of WATCH_CONTROL_PARAMS) params.delete(param);
  params.sort();
  return `${url.origin}${url.pathname}?${params.toString()}`;
}

describe('WatchHub scope authorization', () => {
  it('opens the first subscriber a stream with their own token', async () => {
    // The opener needs no separate probe: the API's answer to this open is
    // their authorization check, which is why it is awaited.
    const { tokens, restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      await hub.subscribe({ clientId: 'client-a', ...DOMAINS });

      expect(tokens()).toEqual(['token-a']);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('refuses the first subscriber when the API refuses their own open', async () => {
    // Before, an unauthorized opener got a 200 from subscribe and a watch-error
    // half a minute later, having been a channel member the whole time.
    const { restore } = stubApiFetch({ deniedTokens: ['token-b'] });
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      await expect(hub.subscribe({ clientId: 'client-b', ...DOMAINS })).rejects.toThrow(
        WatchAuthorizationError
      );

      // No channel, no upstream, no subscriber: nothing for anyone to inherit.
      expect(hub.getStats()).toMatchObject({ upstreams: 0, subscriptions: {} });
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('checks a joining user against the API with their own credentials', async () => {
    const { tokens, restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      await hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      await hub.subscribe({ clientId: 'client-b', ...DOMAINS });

      // user-b's own token reached the API before user-a's stream was fanned
      // out to them — one open, then one check.
      expect(tokens()).toEqual(['token-a', 'token-b']);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('refuses a subscriber the API will not authorize for the scope', async () => {
    const { restore } = stubApiFetch({ deniedTokens: ['token-b'] });
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });

      await expect(hub.subscribe({ clientId: 'client-b', ...DOMAINS })).rejects.toThrow(
        WatchAuthorizationError
      );

      // Refused means not attached: the stream still fans out to user-a alone.
      expect(hub.getStats().subscriptions[channel]).toBe(1);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('refuses a subscriber the API rejects in-band on a 200', async () => {
    // Kubernetes reports 410 Gone as a 200 whose body carries a Status, so a
    // proxy reporting a refusal the same way is not hypothetical. Checking
    // only the status line would admit this caller.
    const { restore } = stubApiFetch({ inBandStatusTokens: ['token-b'] });
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });

      await expect(hub.subscribe({ clientId: 'client-b', ...DOMAINS })).rejects.toThrow(
        WatchAuthorizationError
      );
      expect(hub.getStats().subscriptions[channel]).toBe(1);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('does not re-check a user already authorized for the channel', async () => {
    // Navigating around a project re-subscribes constantly; the check is a
    // round trip and must not ride along on every one of them.
    const { requests, restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      await hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      await hub.subscribe({ clientId: 'client-b', ...DOMAINS });
      const afterFirstJoin = requests.length;

      await hub.subscribe({ clientId: 'client-b', ...DOMAINS });
      await hub.subscribe({ clientId: 'client-b', ...DOMAINS });

      expect(requests.length).toBe(afterFirstJoin);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('re-checks a user whose recorded authorization has expired', async () => {
    const { requests, restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      await hub.subscribe({ clientId: 'client-b', ...DOMAINS });
      const afterFirstJoin = requests.length;

      // Age the memo past its TTL rather than waiting five minutes for it.
      const channels = (
        hub as unknown as { channels: Map<string, { authorizedUntil: Map<string, number> }> }
      ).channels;
      channels.get(channel)!.authorizedUntil.set('user-b', Date.now() - 1);

      await hub.subscribe({ clientId: 'client-b', ...DOMAINS });

      expect(requests.length).toBe(afterFirstJoin + 1);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('refuses a subscriber when the API cannot be reached', async () => {
    // Fails closed: an unverifiable subscriber is not attached.
    const { restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });
      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });

      const reachable = globalThis.fetch;
      globalThis.fetch = (() =>
        Promise.reject(new Error('network down'))) as typeof globalThis.fetch;

      await expect(hub.subscribe({ clientId: 'client-b', ...DOMAINS })).rejects.toThrow(
        WatchAuthorizationError
      );
      expect(hub.getStats().subscriptions[channel]).toBe(1);
      globalThis.fetch = reachable;
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it.each([
    ['closes without serving anything', { emptyCloseTokens: ['token-b'] }],
    ['answers with a bare Status body', { bareStatusTokens: ['token-b'] }],
    ['sends an ERROR carrying no status code', { codelessErrorTokens: ['token-b'] }],
    ['rejects the read instead of going idle', { erroringTokens: ['token-b'] }],
  ])('refuses a subscriber when the API %s', async (_label, behaviour) => {
    // All three are 200s. A check that stopped at the status line would admit
    // every one of them, and the last two would slip past a check that only
    // looked for an error `code`.
    const { restore } = stubApiFetch(behaviour);
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });
      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });

      await expect(hub.subscribe({ clientId: 'client-b', ...DOMAINS })).rejects.toThrow(
        WatchAuthorizationError
      );
      expect(hub.getStats().subscriptions[channel]).toBe(1);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('refuses the first subscriber the API rejects in-band on a 200', async () => {
    // The opener's own fetch is their authorization check, so it is decided by
    // the same rule as everyone else's. A 200 carrying a denial used to create
    // the channel, write the memo, and start a reconnect loop whose retry
    // ceiling is never reached because every "successful" open resets it.
    const { restore } = stubApiFetch({ inBandStatusTokens: ['token-b'] });
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      await expect(hub.subscribe({ clientId: 'client-b', ...DOMAINS })).rejects.toThrow(
        WatchAuthorizationError
      );
      expect(hub.getStats()).toMatchObject({ upstreams: 0, subscriptions: {} });
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('refuses the first subscriber when their own stream read rejects mid-verdict', async () => {
    // A dropped connection, a TLS reset, or a proxy killing the response body
    // mid-stream rejects the pending `reader.read()` that `readStreamVerdict`
    // races against its silence deadline. Only the deadline's own timeout
    // means "idle, therefore accept" — this is the read itself failing, and
    // it must refuse exactly like any other denial, not be admitted as if it
    // were silence.
    const { restore } = stubApiFetch({ erroringTokens: ['token-b'] });
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      await expect(hub.subscribe({ clientId: 'client-b', ...DOMAINS })).rejects.toThrow(
        WatchAuthorizationError
      );
      expect(hub.getStats()).toMatchObject({ upstreams: 0, subscriptions: {} });
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('admits a subscriber the API serves an open but idle stream', async () => {
    // Deliberate, and the limit of what behaviour can tell you: an authorized
    // watch of an empty collection is a 200 that stays open and says nothing.
    // A control plane that denied the same way would be admitted here.
    const { restore } = stubApiFetch({ idleTokens: ['token-b'] });
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });
      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });

      await hub.subscribe({ clientId: 'client-b', ...DOMAINS });

      expect(hub.getStats().subscriptions[channel]).toBe(2);
    } finally {
      hub.shutdown();
      restore();
    }
  }, 10000);

  it('does not echo the control plane response back to the caller', async () => {
    // The upstream error carries the API's own body and the internal channel
    // key, and the subscribe route puts `err.message` into its JSON.
    const { restore } = stubApiFetch({ deniedTokens: ['token-b'] });
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      const error = await hub
        .subscribe({ clientId: 'client-b', ...DOMAINS })
        .then(() => null)
        .catch((err: Error) => err);

      expect(error).toBeInstanceOf(WatchAuthorizationError);
      expect(error!.message).toBe('Not authorized to watch this channel');
      expect(error!.message).not.toContain('project-1');
    } finally {
      hub.shutdown();
      restore();
    }
  });
});

describe('WatchHub subscriptions that stop being current', () => {
  /**
   * Authorizing is a round trip, and the client can vanish during it. Adding
   * the id afterwards would leave a subscriber set that can never reach zero,
   * so the channel and its upstream would never be torn down again — and the
   * revocation bound that teardown provides would quietly stop holding.
   */
  it('does not admit a client that disconnected while it was being checked', async () => {
    const { restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });
      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });

      const joining = hub.subscribe({ clientId: 'client-b', ...DOMAINS });
      hub.removeClient('client-b');

      await expect(joining).rejects.toThrow(/no longer current/);
      expect(hub.getStats().subscriptions[channel]).toBe(1);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('leaves an opener that disconnected mid-open out of the channel it opened', async () => {
    // The same window on the open path. The channel exists, but with nobody in
    // it — so the grace timer can still close it.
    const { restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });

      const opening = hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      hub.removeClient('client-a');

      await expect(opening).rejects.toThrow(/no longer current/);

      const counts = Object.values(hub.getStats().subscriptions);
      expect(counts).toEqual([0]);
    } finally {
      hub.shutdown();
      restore();
    }
  });
});

describe('WatchHub channel lifetime', () => {
  /**
   * The subscriber set and the upstream have to live and die together. When
   * they did not, an unauthorized client could sit in a channel whose upstream
   * had been torn down and then be fanned out to by the next upstream — one
   * opened, and authorized, by somebody else entirely.
   */
  it('drops the subscriber set when the channel is closed', async () => {
    const { restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      const { writes } = registerFakeClient(hub, 'client-a', {
        userId: 'user-a',
        token: 'token-a',
      });

      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      expect(hub.getStats().subscriptions[channel]).toBe(1);

      (hub as unknown as { closeChannel(key: string): void }).closeChannel(channel);

      expect(hub.getStats()).toMatchObject({ upstreams: 0, subscriptions: {} });
      expect(writes.some((w) => w.event === 'unsubscribed')).toBe(true);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('refuses to serve a subscriber set whose upstream is gone', async () => {
    // Construct the state directly — it is unreachable through the API, and
    // that is the point: if the two maps ever drift apart, the orphan must be
    // discarded rather than adopted by whoever opens the next upstream.
    const { tokens, emit, restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      const { writes: writesB } = registerFakeClient(hub, 'client-b', {
        userId: 'user-b',
        token: 'token-b',
      });
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });

      const channel = await hub.subscribe({ clientId: 'client-b', ...DOMAINS });
      // client-b's own open replays the event that authorized it — capture
      // that baseline before orphaning the channel, so the assertion below
      // is about what arrives *after*, not about that legitimate replay.
      const afterOwnOpen = writesB.filter((w) => w.event === 'watch').length;

      // Strand the subscriber set: upstream gone, subscribers left behind.
      (hub as unknown as { upstreams: Map<string, unknown> }).upstreams.delete(channel);

      // An entitled user now opens the same channel.
      const reopened = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      expect(reopened).toBe(channel);

      // The orphan was discarded rather than adopted.
      expect(hub.getStats().subscriptions[channel]).toBe(1);
      expect(tokens()).toEqual(['token-b', 'token-a']);

      // And receives nothing further from the upstream it did not authorize.
      emit();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(writesB.filter((w) => w.event === 'watch')).toHaveLength(afterOwnOpen);
    } finally {
      hub.shutdown();
      restore();
    }
  });
});

describe('WatchHub client registration', () => {
  it('refuses to rebind a client id to a different user', () => {
    // `channels` tracks subscribers by client id, and the id travels as a
    // query parameter, so rebinding one would hand over its memberships
    // without any subscribe call — and therefore without any check.
    const hub = new WatchHub();

    try {
      expect(registerFakeClient(hub, 'client-1', { userId: 'user-a' }).accepted).toBe('accepted');
      expect(registerFakeClient(hub, 'client-1', { userId: 'user-b' }).accepted).toBe(
        'client-id-in-use'
      );
    } finally {
      hub.shutdown();
    }
  });

  it('lets the same user re-register after a reconnect', () => {
    const hub = new WatchHub();

    try {
      expect(registerFakeClient(hub, 'client-1', { userId: 'user-a' }).accepted).toBe('accepted');
      expect(registerFakeClient(hub, 'client-1', { userId: 'user-a' }).accepted).toBe('accepted');
    } finally {
      hub.shutdown();
    }
  });
});

describe('WatchHub authorization probe addressing', () => {
  type UrlBuilders = {
    buildUpstreamUrl(req: Record<string, unknown>, userId?: string): string;
    buildProbeUrl(url: string): string;
  };

  const scopes: Array<{ label: string; req: Record<string, unknown> }> = [
    {
      label: 'user-scoped',
      req: { resourceType: 'apis/iam.miloapis.com/v1alpha1/userinvitations', userScoped: true },
    },
    {
      label: 'org-scoped',
      req: { resourceType: 'apis/resourcemanager.miloapis.com/v1alpha1/projects', orgId: 'org-1' },
    },
    {
      label: 'org-scoped with a namespace',
      req: {
        resourceType: 'apis/billing.miloapis.com/v1alpha1/billingaccounts',
        orgId: 'org-1',
        namespace: 'organization-org-1',
      },
    },
    {
      label: 'project-scoped with selectors',
      req: {
        resourceType: 'apis/networking.datumapis.com/v1alpha/domains',
        projectId: 'project-1',
        namespace: 'default',
        labelSelector: 'app=web',
        fieldSelector: 'status.phase=Running',
      },
    },
    { label: 'namespace-scoped', req: { resourceType: 'api/v1/secrets', namespace: 'default' } },
    { label: 'cluster-scoped', req: { resourceType: 'api/v1/namespaces' } },
  ];

  for (const { label, req } of scopes) {
    it(`probes exactly the resource the ${label} upstream watches`, () => {
      const hub = new WatchHub();
      const builders = hub as unknown as UrlBuilders;

      try {
        const upstreamUrl = builders.buildUpstreamUrl(req, 'user-a');
        const probeUrl = builders.buildProbeUrl(upstreamUrl);

        // Same host, same path, same selectors — the probe and the thing it
        // authorizes must not be able to address different resources.
        expect(addressableIdentity(probeUrl)).toBe(addressableIdentity(upstreamUrl));

        const params = new URL(probeUrl).searchParams;
        expect(params.get('watch')).toBe('true');
        expect(params.get('resourceVersion')).toBe('0');
        // Exactly one, and the same value the upstream asks for: the base URL
        // already carries a `timeoutSeconds`, and Go reads the first
        // occurrence, so a second appended one would be silently ignored.
        expect(params.getAll('timeoutSeconds')).toEqual(['300']);
      } finally {
        hub.shutdown();
      }
    });
  }
});

describe('WatchHub cross-user inheritance', () => {
  /**
   * The reported sequence, end to end. A user with no access to a project used
   * to be able to subscribe to it while nobody was watching — no upstream
   * meant no check — sit through their own upstream's retries, and then be
   * fanned out to by the stream an entitled user opened afterwards.
   */
  it("never fans an entitled user's stream out to a user refused for that scope", async () => {
    const { emit, restore } = stubApiFetch({ deniedTokens: ['token-b'] });
    const hub = new WatchHub();

    try {
      const { writes: writesB } = registerFakeClient(hub, 'client-b', {
        userId: 'user-b',
        token: 'token-b',
      });
      const { writes: writesA } = registerFakeClient(hub, 'client-a', {
        userId: 'user-a',
        token: 'token-a',
      });

      // Nobody is watching the project yet — the case that used to skip the check.
      await expect(hub.subscribe({ clientId: 'client-b', ...DOMAINS })).rejects.toThrow(
        WatchAuthorizationError
      );

      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      emit();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(hub.getStats().subscriptions[channel]).toBe(1);
      // Two, not one: the stub's on-open ADDED_EVENT — the chunk that
      // authorized client-a's own open and is replayed to them — plus the
      // second ADDED_EVENT `emit()` pushes afterward.
      expect(writesA.filter((w) => w.event === 'watch')).toHaveLength(2);
      expect(writesB.filter((w) => w.event === 'watch')).toHaveLength(0);
    } finally {
      hub.shutdown();
      restore();
    }
  });
});

describe('WatchHub opener replay', () => {
  /**
   * The chunk(s) consumed to accept the open — in practice the K8s bootstrap
   * burst of ADDED events — must reach the opener, not just later
   * subscribers. `runUpstream`'s prefix-draining loop runs synchronously,
   * before `subscribe` regains control and admits the opener, so this only
   * holds because `openChannel` admits the opener into the subscriber set
   * before starting that loop.
   */
  it('replays the events that authorized the open to the opener who consumed them', async () => {
    const { restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      const { writes } = registerFakeClient(hub, 'client-a', {
        userId: 'user-a',
        token: 'token-a',
      });

      await hub.subscribe({ clientId: 'client-a', ...DOMAINS });

      // No `emit()`, no extra wait: this is purely the replay of the chunk
      // `readStreamVerdict` consumed to accept the open in the first place.
      expect(writes.filter((w) => w.event === 'watch')).toHaveLength(1);
    } finally {
      hub.shutdown();
      restore();
    }
  });
});

describe('WatchHub concurrent opens', () => {
  it('opens one upstream when two subscribes for a channel race', async () => {
    // Opening is awaited now (it is the opener's authorization check), which
    // leaves a window where neither `channels` nor `upstreams` holds the key.
    const { tokens, restore } = stubApiFetch();
    const hub = new WatchHub();

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      registerFakeClient(hub, 'client-b', { userId: 'user-b', token: 'token-b' });

      const [channelA, channelB] = await Promise.all([
        hub.subscribe({ clientId: 'client-a', ...DOMAINS }),
        hub.subscribe({ clientId: 'client-b', ...DOMAINS }),
      ]);

      expect(channelA).toBe(channelB);
      expect(hub.getStats().upstreams).toBe(1);
      expect(hub.getStats().subscriptions[channelA]).toBe(2);

      // One open, shared — and the user it did not authorize was still checked.
      expect(tokens()).toEqual(['token-a', 'token-b']);
    } finally {
      hub.shutdown();
      restore();
    }
  });
});

describe('WatchHub subscriber-set identity across a same-id reconnect', () => {
  type Internals = {
    clients: Map<string, WatchClient>;
    openChannel(
      watchKey: string,
      req: WatchSubscribeRequest,
      client: WatchClient
    ): Promise<WatchChannel>;
    admitToChannel(channel: WatchChannel, client: WatchClient): Promise<void>;
  };

  /**
   * `channel.subscribers` is a `Set<string>` keyed by client id, and
   * `registerClient` deliberately lets a user reconnect and re-register the
   * same id under a brand new client object (see "lets the same user
   * re-register after a reconnect"). Both `openChannel`'s early admission of
   * the opener and `admitToChannel`'s retraction of a stale one write that
   * set by id. Without an identity check on each, a client that opened a
   * channel and disconnected before its own admission caught up, and a
   * client that reconnects under the same id and legitimately subscribes to
   * that same channel, can step on each other: the stale opener's belated
   * admission check would delete the id the fresh client already
   * legitimately holds.
   *
   * Driven directly against `openChannel` and `admitToChannel` for the stale
   * side, rather than by racing two real `subscribe()` calls: the production
   * defect is a genuine timing-dependent race between two independently
   * scheduled requests, and pinning a unit test to one exact microtask
   * ordering would test that ordering, not the property that has to hold
   * regardless of it.
   */
  it("keeps a reconnected client subscribed despite a stale opener's belated admission check", async () => {
    const { emit, restore } = stubApiFetch();
    const hub = new WatchHub();
    const internals = hub as unknown as Internals;
    const watchKey = buildWatchChannelKey(DOMAINS, 'user-a');

    try {
      // O1 opens the channel, then disconnects before its own admission
      // check gets to run — `openChannel` is exercised directly, mid-open,
      // so its guard on the early admission of the opener is actually in
      // play, the same way "leaves an opener that disconnected mid-open out
      // of the channel it opened" exercises it through `subscribe`.
      const { accepted } = registerFakeClient(hub, 'client-x', {
        userId: 'user-a',
        token: 'token-a1',
      });
      expect(accepted).toBe('accepted');
      const staleO1 = internals.clients.get('client-x')!;

      const opening = internals.openChannel(
        watchKey,
        { clientId: 'client-x', ...DOMAINS },
        staleO1
      );
      hub.removeClient('client-x');
      const channel = await opening;

      // The guard kept the early add from happening at all for a client
      // already gone by the time `openChannel` reached it.
      expect(channel.subscribers.has('client-x')).toBe(false);

      // O2 reconnects under the same id and legitimately joins the same
      // channel O1 opened.
      const { writes: writesO2 } = registerFakeClient(hub, 'client-x', {
        userId: 'user-a',
        token: 'token-a2',
      });
      const joined = await hub.subscribe({ clientId: 'client-x', ...DOMAINS });
      expect(joined).toBe(watchKey);
      expect(channel.subscribers.has('client-x')).toBe(true);

      // O1's own admission check finally catches up. It is stale and must
      // refuse — without touching O2's now-current membership.
      await expect(internals.admitToChannel(channel, staleO1)).rejects.toThrow(/no longer current/);

      expect(channel.subscribers.has('client-x')).toBe(true);
      expect(internals.clients.get('client-x')!.subscriptions.has(watchKey)).toBe(true);

      // And O2 keeps receiving broadcasts — it was never actually dropped.
      emit();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(writesO2.some((w) => w.event === 'watch')).toBe(true);
    } finally {
      hub.shutdown();
      restore();
    }
  });
});

describe('WatchHub 410 Gone reconnection', () => {
  /**
   * The 410 recovery path — reset resourceVersion, broadcast `resync`, retry
   * with exponential backoff up to {@link MAX_RECONNECT_ATTEMPTS} — was
   * hand-ported into `pumpUpstream`'s `drain()` closure during a three-way
   * merge (security branch's restructuring + feature branch's bounded
   * backoff). Neither branch ever tested it. What has to hold: a
   * `resourceVersion` that keeps expiring must not become an unbounded
   * reconnect loop that also storms every subscriber with a fresh `resync`
   * on every iteration.
   *
   * Driven directly through `pumpUpstream` — the same method a real
   * reconnect calls — rather than through the real `setTimeout` chain
   * `scheduleUpstreamReconnect` schedules. Letting that chain actually run
   * would mean multi-second real waits per test (delays here reach 16s), so
   * `scheduleUpstreamReconnect` is replaced with a recorder on the instance,
   * the same kind of direct-internals access "WatchHub subscriber-set
   * identity across a same-id reconnect" already uses. `reconnectAttempts`
   * is advanced by hand between calls to model what consecutive attempts
   * see, matching what `scheduleUpstreamReconnect` itself increments between
   * real retries.
   */

  type Internals = {
    upstreams: Map<string, UpstreamWatch>;
    pumpUpstream(
      upstream: UpstreamWatch,
      reader: ReadableStreamDefaultReader<Uint8Array>,
      token: string
    ): Promise<void>;
    scheduleUpstreamReconnect: (upstream: UpstreamWatch, token: string, delayMs: number) => void;
  };

  /** A fresh reader over a 200 whose body is a single in-band 410 Status line. */
  async function goneReader(): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const res = await fetch('https://upstream.example/watch', {
      headers: { Authorization: 'Bearer token-gone' },
    });
    return res.body!.getReader();
  }

  it('broadcasts a resync marker before scheduling the reconnect', async () => {
    // Load-bearing for clients re-anchoring their replay window: broadcast
    // after the reconnect would let a paused reader double-count records
    // already on screen.
    const { restore } = stubApiFetch({ goneTokens: ['token-gone'] });
    const hub = new WatchHub();
    const internals = hub as unknown as Internals;

    try {
      const { writes } = registerFakeClient(hub, 'client-a', {
        userId: 'user-a',
        token: 'token-a',
      });
      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      const upstream = internals.upstreams.get(channel)!;

      let resyncBroadcastFirst = false;
      internals.scheduleUpstreamReconnect = () => {
        resyncBroadcastFirst = writes.some((w) => w.event === 'resync');
      };

      await internals.pumpUpstream(upstream, await goneReader(), 'token-gone');

      const resync = writes.find((w) => w.event === 'resync');
      expect(resync).toBeDefined();
      expect(JSON.parse(resync!.data!)).toEqual({ channel });
      expect(resyncBroadcastFirst).toBe(true);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('backs off exponentially across successive 410 reconnect attempts', async () => {
    // Not the security branch's fixed 100ms retry — the delay has to grow.
    const { restore } = stubApiFetch({ goneTokens: ['token-gone'] });
    const hub = new WatchHub();
    const internals = hub as unknown as Internals;

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      const upstream = internals.upstreams.get(channel)!;

      const delays: number[] = [];
      internals.scheduleUpstreamReconnect = (_upstream, _token, delayMs) => {
        delays.push(delayMs);
      };

      // Model three consecutive attempts by advancing the counter the same
      // way `scheduleUpstreamReconnect` does between real retries.
      for (const attempt of [0, 1, 2]) {
        upstream.reconnectAttempts = attempt;
        await internals.pumpUpstream(upstream, await goneReader(), 'token-gone');
      }

      expect(delays).toEqual([
        BASE_RECONNECT_DELAY,
        BASE_RECONNECT_DELAY * 2,
        BASE_RECONNECT_DELAY * 4,
      ]);
      expect(delays[1]).toBeGreaterThan(delays[0]);
      expect(delays[2]).toBeGreaterThan(delays[1]);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('stops reconnecting once MAX_RECONNECT_ATTEMPTS consecutive 410s are reached', async () => {
    const { restore } = stubApiFetch({ goneTokens: ['token-gone'] });
    const hub = new WatchHub();
    const internals = hub as unknown as Internals;

    try {
      registerFakeClient(hub, 'client-a', { userId: 'user-a', token: 'token-a' });
      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      const upstream = internals.upstreams.get(channel)!;

      let rescheduled = false;
      internals.scheduleUpstreamReconnect = () => {
        rescheduled = true;
      };

      // As if MAX_RECONNECT_ATTEMPTS consecutive 410s had already run.
      upstream.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
      await internals.pumpUpstream(upstream, await goneReader(), 'token-gone');

      expect(rescheduled).toBe(false);
    } finally {
      hub.shutdown();
      restore();
    }
  });

  it('broadcasts watch-error and tears down the channel once retries are exhausted', async () => {
    const { restore } = stubApiFetch({ goneTokens: ['token-gone'] });
    const hub = new WatchHub();
    const internals = hub as unknown as Internals;

    try {
      const { writes } = registerFakeClient(hub, 'client-a', {
        userId: 'user-a',
        token: 'token-a',
      });
      const channel = await hub.subscribe({ clientId: 'client-a', ...DOMAINS });
      const upstream = internals.upstreams.get(channel)!;

      upstream.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
      await internals.pumpUpstream(upstream, await goneReader(), 'token-gone');

      const watchError = writes.find((w) => w.event === 'watch-error');
      expect(watchError).toBeDefined();
      expect(JSON.parse(watchError!.data!)).toMatchObject({
        channel,
        message: 'Max reconnection attempts exceeded',
      });

      // Subscribers are notified, and the channel record and upstream are
      // torn down — not left orphaned.
      expect(writes.some((w) => w.event === 'unsubscribed')).toBe(true);
      expect(hub.getStats()).toMatchObject({ upstreams: 0, subscriptions: {} });
    } finally {
      hub.shutdown();
      restore();
    }
  });
});

describe('WatchHub 410 Gone real reconnect chain', () => {
  /**
   * The four tests above pin `drain()`'s backoff/ceiling logic by calling
   * `pumpUpstream` directly and advancing `reconnectAttempts` by hand. They
   * cannot catch a defect in what sits *between* real reconnects:
   * `openUpstreamStream` — which every real reconnect goes through before
   * `pumpUpstream` ever runs — used to reset `reconnectAttempts = 0` on any
   * HTTP-level 200, before the body was inspected. Kubernetes reports 410
   * Gone as a 200 whose body carries an error `Status`, so a persistently
   * expiring resourceVersion had its budget wiped clean right before
   * `drain()` read it on every single cycle: the delay never grew past
   * `BASE_RECONNECT_DELAY`, the ceiling was never reached, and the loop ran
   * forever — storming every subscriber with a `resync` each time.
   *
   * This drives the real chain: `subscribe` → `openChannel` →
   * `scheduleUpstreamReconnect`'s actual `setTimeout` → `connectUpstream` →
   * `openUpstreamStream` → `pumpUpstream`, against an upstream that answers
   * 200-with-in-band-410 on every request after the one that opens the
   * channel. Fake timers stand in for the real delays (up to 16s at
   * `MAX_RECONNECT_ATTEMPTS`), with the async fetch/read/drain chain flushed
   * between advances so each reconnect's own `setTimeout` is registered
   * before the next jump.
   */

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * A control plane that serves the opening watch (one real event, so
   * `readStreamVerdict` admits the subscriber and a channel actually gets
   * created) and then answers *every* reconnect with a 200 whose body is
   * nothing but an in-band 410 — a resourceVersion that keeps expiring.
   * Unlike `stubApiFetch`'s per-token fixtures, this depends on call order,
   * because the defect is specifically about what the real reconnect chain
   * does on each successive attempt.
   */
  function stubPersistentGone() {
    const original = globalThis.fetch;
    const encoder = new TextEncoder();
    let calls = 0;

    const stream = (lines: string[]) =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            for (const line of lines) controller.enqueue(encoder.encode(line));
            controller.close();
          },
        })
      );

    globalThis.fetch = (() => {
      calls++;
      if (calls === 1) return Promise.resolve(stream([ADDED_EVENT, GONE_STATUS]));
      return Promise.resolve(stream([GONE_STATUS]));
    }) as typeof globalThis.fetch;

    return { restore: () => void (globalThis.fetch = original) };
  }

  /** Drain the microtask queue so async work chained off a fired fake timer
   *  (fetch → read → drain → the next `scheduleUpstreamReconnect`) settles
   *  before the next `advanceTimersByTime`. */
  async function flushAsync(): Promise<void> {
    for (let i = 0; i < 50; i++) {
      await Promise.resolve();
    }
  }

  it('bounds a persistently-expiring resourceVersion through the real reconnect chain', async () => {
    const { restore } = stubPersistentGone();
    jest.useFakeTimers();
    const hub = new WatchHub();
    const internals = hub as unknown as {
      scheduleUpstreamReconnect: (upstream: UpstreamWatch, token: string, delayMs: number) => void;
    };

    // Spy without replacing: the real scheduling must still run so the
    // chain actually reconnects, unlike the tests above.
    const originalSchedule = internals.scheduleUpstreamReconnect.bind(hub);
    const delays: number[] = [];
    internals.scheduleUpstreamReconnect = (upstream, token, delayMs) => {
      delays.push(delayMs);
      originalSchedule(upstream, token, delayMs);
    };

    try {
      const { writes } = registerFakeClient(hub, 'client-a', {
        userId: 'user-a',
        token: 'token-a',
      });
      await hub.subscribe({ clientId: 'client-a', ...DOMAINS });

      // Coarse steps, each larger than the widest possible single delay
      // (16s at the last attempt), so every reconnect fires within one step
      // regardless of whether the delay actually grows.
      for (let i = 0; i < 6; i++) {
        jest.advanceTimersByTime(BASE_RECONNECT_DELAY * 2 ** MAX_RECONNECT_ATTEMPTS);
        await flushAsync();
      }

      // The delay grows...
      expect(delays).toEqual([
        BASE_RECONNECT_DELAY,
        BASE_RECONNECT_DELAY * 2,
        BASE_RECONNECT_DELAY * 4,
        BASE_RECONNECT_DELAY * 8,
        BASE_RECONNECT_DELAY * 16,
      ]);

      // ...MAX_RECONNECT_ATTEMPTS is reached...
      const watchError = writes.find((w) => w.event === 'watch-error');
      expect(watchError).toBeDefined();
      expect(JSON.parse(watchError!.data!)).toMatchObject({
        message: 'Max reconnection attempts exceeded',
      });

      // ...and the channel is closed, not left retrying forever.
      expect(writes.some((w) => w.event === 'unsubscribed')).toBe(true);
      expect(hub.getStats()).toMatchObject({ upstreams: 0, subscriptions: {} });
    } finally {
      hub.shutdown();
      jest.useRealTimers();
      restore();
    }
  });
});
