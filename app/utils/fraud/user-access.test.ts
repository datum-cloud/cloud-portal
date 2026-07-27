import { getUserWithAccessRetry } from './user-access';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const get = mock(async () => ({ sub: 'user-1', registrationApproval: 'Approved' }));
const refreshTokens = mock(async () => ({
  session: { accessToken: 'fresh-token', expiredAt: new Date().toISOString(), sub: 'user-1' },
  headers: new Headers({ 'Set-Cookie': 'session=fresh' }),
}));

mock.module('@/resources/users', () => ({
  createUserService: () => ({ get }),
}));

// Partial mock. `mock.module` is process-global in Bun and every test file
// shares one module registry, so replacing the whole '@/utils/auth' barrel here
// strips exports that later test files still need — session.server.ts imports
// AUTH_COOKIE_KEYS, AuthService and sessionStorage from this same barrel, while
// only getRefreshToken/getSession/refreshTokens were stubbed. Spreading the real
// module keeps the rest intact so this stub cannot leak past this file.
const actualAuth = await import('@/utils/auth');

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
