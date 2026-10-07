/// <reference types="bun-types/test" />
/**
 * Tests for the Redis singleflight refresh lock (multi-pod coordination).
 *
 * When REDIS_URL is configured the refresh path prefers a Redis lock over the
 * in-memory Map, so concurrent refreshes for the same token — even on different
 * pods — perform ONE Zitadel rotation and every waiter reuses the winner's
 * outcome (a rotated session, or the shared failure). These tests inject a small
 * in-memory fake for `@/modules/redis` so the singleflight logic runs without a
 * real Redis, and stub the Zitadel strategy so no network call is made.
 *
 * Covered branches: successful singleflight + result reuse, shared leader
 * failure, best-effort publish after a successful rotation, and fallback to the
 * in-memory path when Redis coordination throws.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  spyOn,
  test,
} from 'bun:test';

// A JWT whose payload is {"sub":"user-123"} (jwtDecode reads the access token's sub).
const ACCESS_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.c2ln';

// --- Fake Redis: just the surface auth.service touches, with error injection --
function createFakeRedis() {
  const store = new Map<string, string>();
  const flags = { failGet: false, failResultSet: false };
  const setCalls: unknown[][] = [];
  const client = {
    // Writable so a test can take Redis "down" and exercise the in-memory path.
    status: 'ready' as string,
    flags,
    setCalls,
    async get(key: string) {
      if (flags.failGet) throw new Error('redis get failed');
      return store.has(key) ? store.get(key)! : null;
    },
    async set(key: string, value: string, ...args: unknown[]) {
      setCalls.push([key, value, ...args]);
      if (flags.failResultSet && key.startsWith('auth:refresh-result')) {
        throw new Error('redis set failed');
      }
      if (args.includes('NX') && store.has(key)) return null;
      store.set(key, value);
      return 'OK';
    },
    async exists(key: string) {
      return store.has(key) ? 1 : 0;
    },
    // Mirrors the compare-and-delete Lua used by releaseRedisLockIfOwned.
    async eval(_script: string, _numKeys: number, key: string, arg: string) {
      if (store.get(key) === arg) {
        store.delete(key);
        return 1;
      }
      return 0;
    },
    __store: store,
  };
  return client;
}

const fakeRedis = createFakeRedis();
mock.module('@/modules/redis', () => ({ redisClient: fakeRedis }));

// Controllable refresh: tests reassign `refreshImpl` per scenario.
let refreshCalls = 0;
let refreshImpl: (token: string) => Promise<unknown> = async () => {
  throw new Error('refreshImpl not set');
};
mock.module('@/modules/auth/strategies/zitadel.server', () => ({
  zitadelIssuer: 'https://zitadel.example.test',
  zitadelStrategy: {
    refreshToken: (token: string) => refreshImpl(token),
    revokeToken: async () => undefined,
  },
}));

const fakeEnv = {
  isProd: false,
  isDev: false,
  public: {
    appUrl: 'https://portal.example.test',
    authOidcIssuer: 'https://zitadel.example.test',
  },
  server: {
    sessionSecret: 'test-session-secret-value',
    authOidcClientId: 'test-client-id',
  },
};
mock.module('@/utils/env/env.server', () => ({ env: fakeEnv }));

const { AuthService, sessionStorage, refreshTokenStorage } = await import('./auth.service');
const { AUTH_COOKIE_KEYS } = await import('./auth.config');

/** A winning-pod refresh that rotates the token after a small delay. */
function winningRefresh(delayMs = 40) {
  return async () => {
    refreshCalls++;
    await new Promise((r) => setTimeout(r, delayMs));
    return {
      accessToken: () => ACCESS_JWT,
      accessTokenExpiresAt: () => new Date(Date.now() + 12 * 60 * 60 * 1000),
      refreshToken: () => 'RT2-rotated',
      idToken: () => undefined,
    };
  };
}

/** Like winningRefresh, but each rotation yields a distinct refresh token. */
function rotatingRefresh() {
  return async (token: string) => {
    refreshCalls++;
    return {
      accessToken: () => ACCESS_JWT,
      accessTokenExpiresAt: () => new Date(Date.now() + 12 * 60 * 60 * 1000),
      refreshToken: () => `${token}>next`,
      idToken: () => undefined,
    };
  };
}

/** A Zitadel-shaped invalid_grant error (the cross-pod rotation-race signal). */
function invalidGrantRefresh() {
  return async () => {
    refreshCalls++;
    const err = new Error('invalid_grant') as Error & { code?: string; description?: string };
    err.code = 'invalid_grant';
    err.description = 'Errors.OIDCSession.RefreshTokenInvalid';
    throw err;
  };
}

async function rawSessions() {
  return {
    sessionRaw: await sessionStorage.getSession(null),
    refreshRaw: await refreshTokenStorage.getSession(null),
  };
}

const cookies = (h: Headers) => {
  const out: string[] = [];
  h.forEach((v, k) => k.toLowerCase() === 'set-cookie' && out.push(v));
  return out;
};

/** A request Cookie header carrying only the given refresh token. */
async function cookieHeaderFor(refreshToken: string): Promise<string> {
  const headers = await AuthService.setRefreshToken(null, refreshToken);
  return cookies(headers)
    .map((c) => c.split(';')[0])
    .join('; ');
}

/** The refresh token a response's Set-Cookie headers would store in the browser. */
async function refreshTokenIn(headers: Headers): Promise<string | undefined> {
  const header = cookies(headers)
    .map((c) => c.split(';')[0])
    .join('; ');
  const raw = await refreshTokenStorage.getSession(header);
  return (raw.get(AUTH_COOKIE_KEYS.REFRESH_TOKEN) as { refreshToken?: string } | undefined)
    ?.refreshToken;
}

/** Rotates `token` `times` times in a row, returning the final refresh token. */
async function rotate(token: string, times: number): Promise<string> {
  let current = token;
  for (let i = 0; i < times; i++) {
    const { sessionRaw, refreshRaw } = await rawSessions();
    await AuthService.refreshTokens(current, sessionRaw, refreshRaw);
    current = `${current}>next`;
  }
  return current;
}

beforeEach(() => {
  fakeRedis.__store.clear();
  fakeRedis.setCalls.length = 0;
  fakeRedis.status = 'ready';
  fakeRedis.flags.failGet = false;
  fakeRedis.flags.failResultSet = false;
  refreshCalls = 0;
});

afterEach(() => {
  refreshImpl = async () => {
    throw new Error('refreshImpl not set');
  };
  // The hook is process-wide; leave a no-op so a spy never leaks across tests.
  AuthService.registerRefreshHook(() => undefined);
});

describe('refreshTokens — Redis singleflight', () => {
  test('concurrent refreshes rotate once and share the winner result', async () => {
    refreshImpl = winningRefresh();

    const { sessionRaw, refreshRaw } = await rawSessions();
    const [a, b] = await Promise.all([
      AuthService.refreshTokens('RT1-shared', sessionRaw, refreshRaw),
      AuthService.refreshTokens('RT1-shared', sessionRaw, refreshRaw),
    ]);

    expect(refreshCalls).toBe(1);
    expect(a.session.sub).toBe('user-123');
    expect(b.session.sub).toBe('user-123');
    expect(cookies(a.headers).length).toBeGreaterThan(0);
    expect(cookies(b.headers).length).toBeGreaterThan(0);
  });

  test('fast path reuses a stored result without calling Zitadel', async () => {
    refreshImpl = winningRefresh();
    const { sessionRaw, refreshRaw } = await rawSessions();
    await AuthService.refreshTokens('RT1-cached', sessionRaw, refreshRaw);
    expect(refreshCalls).toBe(1);

    const again = await AuthService.refreshTokens('RT1-cached', sessionRaw, refreshRaw);
    expect(refreshCalls).toBe(1);
    expect(again.session.sub).toBe('user-123');
  });

  test('a leader failure is shared, so Zitadel is hit once and every waiter sees it', async () => {
    refreshImpl = invalidGrantRefresh();

    const { sessionRaw, refreshRaw } = await rawSessions();
    const results = await Promise.allSettled([
      AuthService.refreshTokens('RT1-doomed', sessionRaw, refreshRaw),
      AuthService.refreshTokens('RT1-doomed', sessionRaw, refreshRaw),
    ]);

    // One Zitadel call across both callers, and both see the same categorised error.
    expect(refreshCalls).toBe(1);
    for (const r of results) {
      expect(r.status).toBe('rejected');
      const err = (r as PromiseRejectedResult).reason as { code?: string };
      expect(err.code).toBe('invalid_grant');
    }
  });

  test('a successful rotation is returned even if publishing the result fails', async () => {
    refreshImpl = winningRefresh(0);
    fakeRedis.flags.failResultSet = true; // the post-rotation publish throws

    const { sessionRaw, refreshRaw } = await rawSessions();
    const result = await AuthService.refreshTokens('RT1-publishfail', sessionRaw, refreshRaw);

    expect(refreshCalls).toBe(1);
    expect(result.session.sub).toBe('user-123');
    expect(cookies(result.headers).length).toBeGreaterThan(0);
  });

  test('a Redis coordination error falls back to the in-memory lock', async () => {
    refreshImpl = winningRefresh(0);
    fakeRedis.flags.failGet = true; // the fast-path read throws before any lock

    const { sessionRaw, refreshRaw } = await rawSessions();
    const result = await AuthService.refreshTokens('RT1-redisdown', sessionRaw, refreshRaw);

    expect(refreshCalls).toBe(1);
    expect(result.session.sub).toBe('user-123');
    expect(cookies(result.headers).length).toBeGreaterThan(0);
  });
});

describe('rotation links', () => {
  test('resolveRotatedSession returns the new session for a rotated refresh token', async () => {
    refreshImpl = rotatingRefresh();
    const { sessionRaw, refreshRaw } = await rawSessions();
    await AuthService.refreshTokens('RT1', sessionRaw, refreshRaw);
    const before = refreshCalls;

    const resolved = await AuthService.resolveRotatedSession(await cookieHeaderFor('RT1'));

    expect(resolved?.session.sub).toBe('user-123');
    expect(cookies(resolved!.headers).length).toBeGreaterThan(0);
    expect(refreshCalls).toBe(before); // no Zitadel call
  });

  test('the ok result is stored for 60 seconds', async () => {
    refreshImpl = rotatingRefresh();
    const { sessionRaw, refreshRaw } = await rawSessions();
    await AuthService.refreshTokens('RT1', sessionRaw, refreshRaw);

    const resultSets = fakeRedis.setCalls.filter((c) =>
      String(c[0]).startsWith('auth:refresh-result:')
    );
    expect(resultSets).toHaveLength(1);
    expect(resultSets[0].slice(2)).toEqual(['PX', 60_000]);
  });

  test('returns null when there is no link', async () => {
    expect(
      await AuthService.resolveRotatedSession(await cookieHeaderFor('never-rotated'))
    ).toBeNull();
  });

  test('follows a chain of two rotations to the newest session', async () => {
    refreshImpl = rotatingRefresh();
    const newest = await rotate('RT1', 2);
    expect(newest).toBe('RT1>next>next');

    const resolved = await AuthService.resolveRotatedSession(await cookieHeaderFor('RT1'));

    expect(await refreshTokenIn(resolved!.headers)).toBe('RT1>next>next');
  });

  test('stops after 3 hops', async () => {
    refreshImpl = rotatingRefresh();
    await rotate('RT1', 5);

    const resolved = await AuthService.resolveRotatedSession(await cookieHeaderFor('RT1'));

    // 1 starting payload + 3 hops = the 4th rotation, not the 5th.
    expect(await refreshTokenIn(resolved!.headers)).toBe(`RT1${'>next'.repeat(4)}`);
  });

  test('the refresh fast path returns the newest session in the chain', async () => {
    refreshImpl = rotatingRefresh();
    await rotate('RT1', 2);
    expect(refreshCalls).toBe(2);

    const { sessionRaw, refreshRaw } = await rawSessions();
    const again = await AuthService.refreshTokens('RT1', sessionRaw, refreshRaw);

    expect(refreshCalls).toBe(2);
    expect(await refreshTokenIn(again.headers)).toBe('RT1>next>next');
  });

  test('the in-memory fallback links rotations without Redis', async () => {
    refreshImpl = rotatingRefresh();
    fakeRedis.status = 'end';
    try {
      const { sessionRaw, refreshRaw } = await rawSessions();
      await AuthService.refreshTokens('RT1-memory', sessionRaw, refreshRaw);
      const cookieHeader = await cookieHeaderFor('RT1-memory');

      const resolved = await AuthService.resolveRotatedSession(cookieHeader);
      expect(resolved?.session.sub).toBe('user-123');
      expect(await refreshTokenIn(resolved!.headers)).toBe('RT1-memory>next');

      setSystemTime(new Date(Date.now() + 60_001));
      expect(await AuthService.resolveRotatedSession(cookieHeader)).toBeNull();
    } finally {
      fakeRedis.status = 'ready';
      setSystemTime();
    }
  });

  test('a rotation made while Redis was down resolves once Redis is back', async () => {
    refreshImpl = rotatingRefresh();
    fakeRedis.status = 'end';
    try {
      const { sessionRaw, refreshRaw } = await rawSessions();
      await AuthService.refreshTokens('RT1-outage', sessionRaw, refreshRaw);
    } finally {
      fakeRedis.status = 'ready';
    }

    const resolved = await AuthService.resolveRotatedSession(await cookieHeaderFor('RT1-outage'));

    expect(resolved).not.toBeNull();
  });

  test('the refresh hook fires for the leader and for resolveRotatedSession', async () => {
    refreshImpl = rotatingRefresh();
    const hook = mock((_event: { userId: string; accessToken: string }) => undefined);
    AuthService.registerRefreshHook(hook);

    const { sessionRaw, refreshRaw } = await rawSessions();
    await AuthService.refreshTokens('RT1', sessionRaw, refreshRaw);
    await AuthService.resolveRotatedSession(await cookieHeaderFor('RT1'));

    expect(hook).toHaveBeenCalledTimes(2);
    for (const call of hook.mock.calls) {
      expect(call[0]).toEqual({ userId: 'user-123', accessToken: ACCESS_JWT });
    }
  });
});

describe('retryWithRotatedSession', () => {
  const RETRY_LOG = '[AuthService] Retried a 401 with a rotated session';
  let warn: ReturnType<typeof spyOn<Console, 'warn'>>;
  const retryLogs = () => warn.mock.calls.filter((call) => call[0] === RETRY_LOG);

  beforeEach(() => {
    warn = spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  async function rotateRT1() {
    refreshImpl = rotatingRefresh();
    const { sessionRaw, refreshRaw } = await rawSessions();
    await AuthService.refreshTokens('RT1', sessionRaw, refreshRaw);
  }

  test('retries once with the newest token and returns its cookies', async () => {
    await rotateRT1();
    const call = mock(async (token: string) => token);

    const retried = await AuthService.retryWithRotatedSession(
      await cookieHeaderFor('RT1'),
      'old-token',
      'axios',
      call
    );

    expect(retried?.result).toBe(ACCESS_JWT);
    expect(call).toHaveBeenCalledTimes(1);
    expect(cookies(retried!.headers).length).toBeGreaterThan(0);
    expect(retryLogs()).toEqual([[RETRY_LOG, { site: 'axios', outcome: 'redeemed' }]]);
  });

  test('returns null without a link and does not call', async () => {
    const call = mock(async (token: string) => token);

    const retried = await AuthService.retryWithRotatedSession(
      await cookieHeaderFor('never-rotated'),
      'old-token',
      'proxy',
      call
    );

    expect(retried).toBeNull();
    expect(call).not.toHaveBeenCalled();
    expect(retryLogs()).toEqual([]);
  });

  test('returns null when the linked token is the one that just failed', async () => {
    await rotateRT1();
    const call = mock(async (token: string) => token);

    const retried = await AuthService.retryWithRotatedSession(
      await cookieHeaderFor('RT1'),
      ACCESS_JWT,
      'graphql',
      call
    );

    expect(retried).toBeNull();
    expect(call).not.toHaveBeenCalled();
    expect(retryLogs()).toEqual([]);
  });

  test('logs retry_failed and returns the result when the retry is rejected', async () => {
    await rotateRT1();
    const call = mock(async () => ({ status: 401 }));

    const retried = await AuthService.retryWithRotatedSession(
      await cookieHeaderFor('RT1'),
      'old-token',
      'proxy',
      call,
      () => true
    );

    expect(retried?.result).toEqual({ status: 401 });
    expect(cookies(retried!.headers).length).toBeGreaterThan(0);
    expect(retryLogs()).toEqual([[RETRY_LOG, { site: 'proxy', outcome: 'retry_failed' }]]);
  });

  test('logs retry_failed and rethrows when the retry throws', async () => {
    await rotateRT1();
    const boom = new Error('upstream down');

    await expect(
      AuthService.retryWithRotatedSession(await cookieHeaderFor('RT1'), 'old-token', 'axios', () =>
        Promise.reject(boom)
      )
    ).rejects.toBe(boom);
    expect(retryLogs()).toEqual([[RETRY_LOG, { site: 'axios', outcome: 'retry_failed' }]]);
  });
});
