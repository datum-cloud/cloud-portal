/// <reference types="bun-types/test" />
/**
 * Regression tests for the cross-pod refresh-token ROTATION RACE.
 *
 * Background (multi-pod only — UNREPRODUCIBLE in single-process local dev):
 * Zitadel strictly rotates refresh tokens. When pod A and pod B receive
 * near-simultaneous requests carrying the same `_session` + `_refresh_token`
 * (RT1), both call refresh. Zitadel rotates -> pod A gets RT2 (success), pod B
 * gets `400 invalid_grant / Errors.OIDCSession.RefreshTokenInvalid`
 * (categorized as REFRESH_TOKEN_REVOKED). The in-memory lock only coordinates
 * WITHIN one process, so it cannot prevent the cross-pod race.
 *
 * The fix (in getValidSession): on REFRESH_TOKEN_REVOKED during an AUTOMATIC
 * refresh, do NOT destroy the refresh cookie and do NOT null+revoke the
 * session — instead keep the current session / leave the cookie intact so the
 * browser's next request (carrying the rotated cookie the winning pod wrote)
 * re-validates cleanly. The token-revoking logout() must NOT be invoked.
 *
 * These tests stub the Zitadel strategy (avoiding the real top-level
 * `await OAuth2.discover()` network call) and the env module so the cookie
 * config builds, then drive getValidSession through the race scenarios.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

// --- Module mocks: must be registered before importing auth.service ---

// Spy we assert is NEVER called by the session-validation race path.
const revokeToken = mock(async (_token: string) => undefined);
// Controllable refresh: tests reassign `refreshImpl` per scenario.
let refreshImpl: (token: string) => Promise<unknown> = async () => {
  throw new Error('refreshImpl not set');
};

mock.module('@/modules/auth/strategies/zitadel.server', () => ({
  zitadelIssuer: 'https://zitadel.example.test',
  zitadelStrategy: {
    refreshToken: (token: string) => refreshImpl(token),
    revokeToken,
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

// Import AFTER mocks are registered.
const { AuthService, sessionStorage, refreshTokenStorage } = await import('./auth.service');
const { AUTH_COOKIE_KEYS } = await import('./auth.config');

/**
 * Builds a Zitadel-shaped invalid_grant error (the REFRESH_TOKEN_REVOKED signal).
 * Mirrors the structured OAuth2 fields categorizeRefreshError() inspects.
 */
function makeInvalidGrantError(): Error {
  const err = new Error('invalid_grant') as Error & { code?: string; description?: string };
  err.code = 'invalid_grant';
  err.description = 'Errors.OIDCSession.RefreshTokenInvalid';
  return err;
}

/** Builds a Cookie header carrying a `_session` and/or `_refresh_token`. */
async function buildCookieHeader(opts: {
  session?: { accessToken: string; expiredAt: Date; sub: string } | null;
  refreshToken?: string | null;
}): Promise<string> {
  const parts: string[] = [];

  if (opts.session) {
    const raw = await sessionStorage.getSession(null);
    raw.set(AUTH_COOKIE_KEYS.SESSION, opts.session);
    const setCookie = await sessionStorage.commitSession(raw);
    parts.push(setCookie.split(';')[0]);
  }

  if (opts.refreshToken) {
    const raw = await refreshTokenStorage.getSession(null);
    raw.set(AUTH_COOKIE_KEYS.REFRESH_TOKEN, {
      refreshToken: opts.refreshToken,
      issuedAt: new Date(),
    });
    const setCookie = await refreshTokenStorage.commitSession(raw);
    parts.push(setCookie.split(';')[0]);
  }

  return parts.join('; ');
}

/** True if any Set-Cookie header would DESTROY the refresh cookie (maxAge=0 / expired). */
function destroysRefreshCookie(headers: Headers): boolean {
  const cookies: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') cookies.push(value);
  });
  return cookies.some(
    (c) =>
      c.includes(AUTH_COOKIE_KEYS.REFRESH_TOKEN) &&
      (/Max-Age=0\b/i.test(c) || /Expires=Thu, 01 Jan 1970/i.test(c))
  );
}

beforeEach(() => {
  revokeToken.mockClear();
});

afterEach(() => {
  // Reset to a safe default so a forgotten assignment fails loudly.
  refreshImpl = async () => {
    throw new Error('refreshImpl not set');
  };
});

describe('getValidSession — cross-pod refresh rotation race (REFRESH_TOKEN_REVOKED)', () => {
  test('Case 2: near-expiry session + REVOKED refresh -> keeps session, no destroy, no revoke', async () => {
    // Access token still valid but inside the refresh window (near expiry).
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // +5m, within 10m window
    const cookieHeader = await buildCookieHeader({
      session: { accessToken: 'AT-valid', expiredAt, sub: 'user-123' },
      refreshToken: 'RT1-near',
    });

    // Simulate the losing pod: Zitadel already rotated RT1 -> invalid_grant.
    refreshImpl = async () => {
      throw makeInvalidGrantError();
    };

    const result = await AuthService.getValidSession(cookieHeader);

    // Session is KEPT (not nulled).
    expect(result.session).not.toBeNull();
    expect(result.session?.accessToken).toBe('AT-valid');
    expect(result.refreshed).toBe(false);
    // Refresh cookie is NOT destroyed.
    expect(destroysRefreshCookie(result.headers)).toBe(false);
    // The revoking logout path is NOT taken.
    expect(revokeToken).not.toHaveBeenCalled();
  });

  test('Case 2: JUST-expired session + REVOKED refresh -> keeps session (extended tolerance), no destroy/revoke', async () => {
    // Access token ticked just past expiry (the race window the fix extends to).
    const expiredAt = new Date(Date.now() - 2 * 1000); // expired 2s ago
    const cookieHeader = await buildCookieHeader({
      session: { accessToken: 'AT-just-expired', expiredAt, sub: 'user-123' },
      refreshToken: 'RT1-expired',
    });

    refreshImpl = async () => {
      throw makeInvalidGrantError();
    };

    const result = await AuthService.getValidSession(cookieHeader);

    // Existing session returned rather than nulled-and-revoked.
    expect(result.session).not.toBeNull();
    expect(result.session?.accessToken).toBe('AT-just-expired');
    expect(destroysRefreshCookie(result.headers)).toBe(false);
    expect(revokeToken).not.toHaveBeenCalled();
  });

  test('Case 1: no session cookie + REVOKED refresh -> does NOT destroy refresh cookie, no revoke', async () => {
    const cookieHeader = await buildCookieHeader({
      session: null,
      refreshToken: 'RT1-restore',
    });

    refreshImpl = async () => {
      throw makeInvalidGrantError();
    };

    const result = await AuthService.getValidSession(cookieHeader);

    // No session to return for THIS request (Case 1 has no _session cookie),
    // but crucially the refresh cookie is preserved for next-request re-validation
    // and the revoking logout path is NOT taken.
    expect(result.session).toBeNull();
    expect(destroysRefreshCookie(result.headers)).toBe(false);
    expect(revokeToken).not.toHaveBeenCalled();
  });

  test('control: genuinely EXPIRED refresh (not a race) still clears the refresh cookie', async () => {
    // A non-race failure (token actually expired) must keep the old destructive behavior.
    const expiredAt = new Date(Date.now() - 60 * 1000); // expired 1m ago
    const cookieHeader = await buildCookieHeader({
      session: { accessToken: 'AT-expired', expiredAt, sub: 'user-123' },
      refreshToken: 'RT1-dead',
    });

    refreshImpl = async () => {
      throw new Error('refresh token has expired'); // -> REFRESH_TOKEN_EXPIRED
    };

    const result = await AuthService.getValidSession(cookieHeader);

    // Genuine expiry: session nulled and refresh cookie destroyed (unchanged behavior).
    expect(result.session).toBeNull();
    expect(destroysRefreshCookie(result.headers)).toBe(true);
    // getValidSession itself never revokes — that is logout()'s job (explicit logout only).
    expect(revokeToken).not.toHaveBeenCalled();
  });

  test('control: successful refresh returns the rotated session (winning pod path)', async () => {
    const expiredAt = new Date(Date.now() - 2 * 1000);
    const cookieHeader = await buildCookieHeader({
      session: { accessToken: 'AT-old', expiredAt, sub: 'user-123' },
      refreshToken: 'RT1-winner',
    });

    // Winning pod: Zitadel rotates and returns RT2 + a fresh access token.
    const newExpiry = new Date(Date.now() + 12 * 60 * 60 * 1000);
    refreshImpl = async () => ({
      // jwtDecode is applied to accessToken(); use a real JWT with sub=user-123.
      accessToken: () => 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.c2ln', // {"sub":"user-123"}
      accessTokenExpiresAt: () => newExpiry,
      refreshToken: () => 'RT2-rotated',
    });

    const result = await AuthService.getValidSession(cookieHeader);

    expect(result.refreshed).toBe(true);
    expect(result.session).not.toBeNull();
    expect(result.session?.sub).toBe('user-123');
    expect(revokeToken).not.toHaveBeenCalled();
  });
});
