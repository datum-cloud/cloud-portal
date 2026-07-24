import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

/**
 * Avoid `mock.module('@/utils/auth', …)` with a partial AuthService. That mock
 * leaks across files in `bun test --coverage` (CI) and breaks auth.utils /
 * auth.service.refresh-race tests (`destroySession` / `getValidSession` missing).
 *
 * Stub zitadel + env so AuthService can load without OIDC discovery, then spy
 * only the static methods this suite needs.
 */

const get = mock(async () => ({ sub: 'user-1', registrationApproval: 'Approved' }));
const refreshTokens = mock(async () => ({
  session: { accessToken: 'fresh-token', expiredAt: new Date().toISOString(), sub: 'user-1' },
  headers: new Headers({ 'Set-Cookie': 'session=fresh' }),
}));

mock.module('@/resources/users', () => ({
  createUserService: () => ({ get }),
}));

mock.module('@/modules/axios/request-context', () => ({
  getRequestContext: () => ({ token: 'stale-token' }),
}));

mock.module('@/modules/auth/strategies/zitadel.server', () => ({
  zitadelIssuer: 'https://zitadel.example.test',
  zitadelStrategy: {
    refreshToken: async () => {
      throw new Error('refreshToken not used in user-access tests');
    },
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
mock.module('@/utils/env', () => ({ env: fakeEnv }));

const { AuthService } = await import('@/utils/auth/auth.service');
const { getUserWithAccessRetry } = await import('./user-access');

describe('getUserWithAccessRetry', () => {
  let getRefreshTokenSpy: ReturnType<typeof spyOn>;
  let getSessionSpy: ReturnType<typeof spyOn>;
  let refreshTokensSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    get.mockClear();
    refreshTokens.mockClear();

    getRefreshTokenSpy = spyOn(AuthService, 'getRefreshToken').mockResolvedValue({
      refreshToken: 'refresh',
      // Cookie session shape is opaque to this test
      rawSession: {} as never,
    });
    getSessionSpy = spyOn(AuthService, 'getSession').mockResolvedValue({
      session: null,
      rawSession: {} as never,
    });
    refreshTokensSpy = spyOn(AuthService, 'refreshTokens').mockImplementation(
      refreshTokens as never
    );
  });

  afterEach(() => {
    getRefreshTokenSpy.mockRestore();
    getSessionSpy.mockRestore();
    refreshTokensSpy.mockRestore();
  });

  it('refreshes the session before reading the user when requested', async () => {
    const result = await getUserWithAccessRetry('user-1', 'cookie=value', {
      refreshBeforeRead: true,
    });

    expect(refreshTokens).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      user: { sub: 'user-1', registrationApproval: 'Approved' },
      refreshedHeaders: expect.any(Headers),
    });
  });
});
