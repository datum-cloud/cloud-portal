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
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

// A JWT whose payload is {"sub":"user-123"} (jwtDecode reads the access token's sub).
const ACCESS_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.c2ln';

// --- Fake Redis: just the surface auth.service touches, with error injection --
function createFakeRedis() {
  const store = new Map<string, string>();
  const flags = { failGet: false, failResultSet: false };
  const client = {
    status: 'ready' as const,
    flags,
    async get(key: string) {
      if (flags.failGet) throw new Error('redis get failed');
      return store.has(key) ? store.get(key)! : null;
    },
    async set(key: string, value: string, ...args: unknown[]) {
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

beforeEach(() => {
  fakeRedis.__store.clear();
  fakeRedis.flags.failGet = false;
  fakeRedis.flags.failResultSet = false;
  refreshCalls = 0;
});

afterEach(() => {
  refreshImpl = async () => {
    throw new Error('refreshImpl not set');
  };
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
