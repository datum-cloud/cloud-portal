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

mock.module('@/utils/auth', () => ({
  AuthService: {
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
