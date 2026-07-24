import { getUserWithAccessRetry } from './user-access';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const get = mock(async () => ({ sub: 'user-1', registrationApproval: 'Approved' }));
const refreshTokens = mock(async () => ({
  session: { accessToken: 'fresh-token', expiredAt: new Date().toISOString(), sub: 'user-1' },
  headers: new Headers({ 'Set-Cookie': 'session=fresh' }),
}));

// `mock.module` replaces the module in Bun's global registry for the rest of
// the test run (not just this file), so any export we omit here becomes
// undefined for every other test file that imports the same module. Capture
// the real modules BEFORE registering the mocks (so the factories below
// don't recursively re-trigger themselves), then spread their exports and
// override only what this suite needs.
const actualUsers = await import('@/resources/users');
const actualAuth = await import('@/utils/auth');
const actualRequestContext = await import('@/modules/axios/request-context');

mock.module('@/resources/users', () => ({
  ...actualUsers,
  createUserService: () => ({ get }),
}));

mock.module('@/utils/auth', () => ({
  ...actualAuth,
  AuthService: {
    ...actualAuth.AuthService,
    getRefreshToken: async () => ({ refreshToken: 'refresh', rawSession: {} }),
    getSession: async () => ({ rawSession: {} }),
    refreshTokens,
  },
}));

mock.module('@/modules/axios/request-context', () => ({
  ...actualRequestContext,
  getRequestContext: () => ({ token: 'stale-token' }),
}));

describe('getUserWithAccessRetry', () => {
  beforeEach(() => {
    get.mockClear();
    refreshTokens.mockClear();
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
