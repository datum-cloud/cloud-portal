import { getUserWithAccessRetry } from './user-access';
import { AuthService } from '@/utils/auth';
import { afterAll, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

const get = mock(async () => ({ sub: 'user-1', registrationApproval: 'Approved' }));
const refreshTokens = mock(async () => ({
  session: { accessToken: 'fresh-token', expiredAt: new Date().toISOString(), sub: 'user-1' },
  headers: new Headers({ 'Set-Cookie': 'session=fresh' }),
}));

// `mock.module` replaces the module in Bun's global registry for the rest of
// the test run (not just this file), so any export we omit here becomes
// undefined for every other test file that imports the same module. Capture
// the real module BEFORE registering the mock, then spread its exports and
// override only what this suite needs.
const actualUsers = await import('@/resources/users');
const actualRequestContext = await import('@/modules/axios/request-context');

mock.module('@/resources/users', () => ({
  ...actualUsers,
  createUserService: () => ({ get }),
}));

mock.module('@/modules/axios/request-context', () => ({
  ...actualRequestContext,
  getRequestContext: () => ({ token: 'stale-token' }),
}));

// `AuthService` is a class shared by reference across every specifier that
// resolves to it (`@/utils/auth`, `./auth.service`, etc.), so `mock.module`
// on the barrel ends up patching the underlying class in place — the
// override then bleeds into unrelated test files that import it directly,
// even after this file's own tests finish. `spyOn` + `mockRestore()` is
// Bun's precise, restorable primitive for patching a shared object's
// methods, so use it instead of `mock.module` for AuthService.
const getRefreshTokenSpy = spyOn(AuthService, 'getRefreshToken').mockImplementation((async () => ({
  refreshToken: 'refresh',
  rawSession: {},
})) as unknown as typeof AuthService.getRefreshToken);
const getSessionSpy = spyOn(AuthService, 'getSession').mockImplementation((async () => ({
  rawSession: {},
})) as unknown as typeof AuthService.getSession);
const refreshTokensSpy = spyOn(AuthService, 'refreshTokens').mockImplementation(
  refreshTokens as unknown as typeof AuthService.refreshTokens
);

afterAll(() => {
  mock.module('@/resources/users', () => actualUsers);
  mock.module('@/modules/axios/request-context', () => actualRequestContext);
  getRefreshTokenSpy.mockRestore();
  getSessionSpy.mockRestore();
  refreshTokensSpy.mockRestore();
});

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
