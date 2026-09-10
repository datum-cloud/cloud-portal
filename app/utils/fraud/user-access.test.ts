import type { UserAccessDeps } from './user-access';
import { getUserWithAccessRetry } from './user-access';
import { describe, expect, it, mock } from 'bun:test';

/**
 * Drives the collaborators through `deps` rather than `mock.module`.
 *
 * `mock.module` is process-global in bun and could not reach this code. The
 * fraud middleware suites import user-access first, binding it to the real
 * auth barrel and user service, so a stub registered here landed on a rebuilt
 * copy that the module under test never called. The real getRefreshToken then
 * ran, found no token on the fake cookie header below, and the refresh path
 * returned early.
 */
function buildDeps(overrides: Partial<UserAccessDeps> = {}) {
  const getRefreshToken = mock(async () => ({
    refreshToken: 'refresh',
    // Cookie session shape is opaque to this test.
    rawSession: {} as never,
  }));
  const getSession = mock(async () => ({ session: null, rawSession: {} as never }));
  const refreshTokens = mock(async () => ({
    session: { accessToken: 'fresh-token', expiredAt: new Date().toISOString(), sub: 'user-1' },
    headers: new Headers({ 'Set-Cookie': 'session=fresh' }),
  }));
  const getUser = mock(async () => ({ sub: 'user-1', platformAccess: 'Approved' }));

  return {
    spies: { getRefreshToken, getSession, refreshTokens, getUser },
    deps: {
      auth: { getRefreshToken, getSession, refreshTokens },
      getUser,
      ...overrides,
    } as Partial<UserAccessDeps>,
  };
}

describe('getUserWithAccessRetry', () => {
  it('refreshes the session before reading the user when requested', async () => {
    const { spies, deps } = buildDeps();

    const result = await getUserWithAccessRetry('user-1', 'cookie=value', {
      refreshBeforeRead: true,
      deps,
    });

    expect(spies.refreshTokens).toHaveBeenCalledTimes(1);
    expect(spies.getUser).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      user: { sub: 'user-1', platformAccess: 'Approved' },
      refreshedHeaders: expect.any(Headers),
    });
  });

  it('reads the user without refreshing when refreshBeforeRead is not set', async () => {
    const { spies, deps } = buildDeps();

    const result = await getUserWithAccessRetry('user-1', 'cookie=value', { deps });

    expect(spies.refreshTokens).toHaveBeenCalledTimes(0);
    expect(spies.getUser).toHaveBeenCalledTimes(1);
    // No session, so the id_token claim is absent and the gate reads unverified.
    expect(result).toEqual({
      user: { sub: 'user-1', platformAccess: 'Approved', emailVerified: false },
    });
  });
});
