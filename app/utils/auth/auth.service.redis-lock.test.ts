/// <reference types="bun-types/test" />
/**
 * Tests for the Redis singleflight refresh lock (multi-pod coordination).
 *
 * When REDIS_URL is configured the refresh path prefers a Redis lock over the
 * in-memory Map, so concurrent refreshes for the same token — even on different
 * pods — perform ONE Zitadel rotation and every waiter reuses the winner's
 * rotated session and Set-Cookie headers. These tests inject a small in-memory
 * fake for `@/modules/redis` so the singleflight logic runs without a real
 * Redis, and stub the Zitadel strategy so no network call is made.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

// A JWT whose payload is {"sub":"user-123"} (jwtDecode reads the access token's sub).
const ACCESS_JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.c2ln';

// --- Fake Redis: just the surface auth.service touches ---------------------
function createFakeRedis() {
  const store = new Map<string, string>();
  const client = {
    status: 'ready' as const,
    async get(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    async set(key: string, value: string, ...args: unknown[]) {
      if (args.includes('NX') && store.has(key)) return null;
      store.set(key, value);
      return 'OK';
    },
    async exists(key: string) {
      return store.has(key) ? 1 : 0;
    },
    async watch(_key: string) {
      return 'OK';
    },
    async unwatch() {
      return 'OK';
    },
    multi() {
      const ops: Array<() => void> = [];
      const chain = {
        del(key: string) {
          ops.push(() => store.delete(key));
          return chain;
        },
        async exec() {
          ops.forEach((op) => op());
          return [[null, 1]];
        },
      };
      return chain;
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

async function rawSessions() {
  return {
    sessionRaw: await sessionStorage.getSession(null),
    refreshRaw: await refreshTokenStorage.getSession(null),
  };
}

beforeEach(() => {
  fakeRedis.__store.clear();
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

    // Exactly one Zitadel rotation across both concurrent callers.
    expect(refreshCalls).toBe(1);
    expect(a.session.sub).toBe('user-123');
    expect(b.session.sub).toBe('user-123');
    // The waiter gets the winner's rotated Set-Cookie headers.
    const cookies = (h: Headers) => {
      const out: string[] = [];
      h.forEach((v, k) => k.toLowerCase() === 'set-cookie' && out.push(v));
      return out;
    };
    expect(cookies(a.headers).length).toBeGreaterThan(0);
    expect(cookies(b.headers).length).toBeGreaterThan(0);
  });

  test('fast path reuses a stored result without calling Zitadel', async () => {
    // Seed a recent result for the derived key, then assert no rotation happens.
    refreshImpl = winningRefresh();
    const { sessionRaw, refreshRaw } = await rawSessions();
    await AuthService.refreshTokens('RT1-cached', sessionRaw, refreshRaw);
    expect(refreshCalls).toBe(1);

    // Second call within the result TTL reuses the stored payload.
    const again = await AuthService.refreshTokens('RT1-cached', sessionRaw, refreshRaw);
    expect(refreshCalls).toBe(1);
    expect(again.session.sub).toBe('user-123');
  });
});
