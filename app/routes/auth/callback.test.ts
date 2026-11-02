import { handleAuthCallback, type AuthCallbackDeps } from './callback.server';
import type { ReturnToAccess } from './post-login-access';
import { withRequestContext } from '@/modules/axios/request-context';
import { logger } from '@/modules/logger';
import type { IAuthSession } from '@/utils/auth/auth.types';
import { paths } from '@/utils/config/paths.config';
import { afterEach, beforeEach, describe, expect, test, vi, type MockInstance } from 'vitest';

const SUB = 'user-123';
const REQUEST_ID = 'req-abc';

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Unsigned JWT; the callback only decodes it. */
const ACCESS_TOKEN = `${base64url({ alg: 'none' })}.${base64url({ sub: SUB, email: 'u@example.com' })}.sig`;

function cookieHeaders(value: string): Headers {
  const headers = new Headers();
  headers.append('Set-Cookie', value);
  return headers;
}

function credentials(overrides: Partial<IAuthSession> = {}): IAuthSession {
  return {
    accessToken: ACCESS_TOKEN,
    expiredAt: new Date('2030-01-01T00:00:00Z'),
    refreshToken: 'refresh-1',
    idToken: 'id-1',
    ...overrides,
  } as IAuthSession;
}

function access(canRead = true) {
  const read = vi.fn(async (id: string) => {
    if (!canRead) throw new Error(`no access to ${id}`);
    return { name: id };
  });
  return { getOrganization: read, getProject: read } satisfies ReturnToAccess;
}

function deps(overrides: Partial<AuthCallbackDeps> = {}) {
  const reads = access();
  const base = {
    getSession: vi.fn(async () => ({ session: undefined, headers: cookieHeaders('_session=') })),
    authenticate: vi.fn(async () => credentials()),
    setSession: vi.fn(async () => cookieHeaders('_session=new')),
    setRefreshToken: vi.fn(async () => cookieHeaders('_refresh_token=new')),
    readEmailVerified: vi.fn(() => true),
    setIdTokenSession: vi.fn(async () => ({ headers: cookieHeaders('_id_token=new') })),
    getRedirectIntent: vi.fn(async () => ({ path: undefined, sub: undefined })),
    clearRedirectIntent: vi.fn(async () => ({
      headers: cookieHeaders('_redirect_intent=; Max-Age=0'),
    })),
    allowedOrigins: ['https://www.datum.net'],
    accessFor: vi.fn(() => reads),
  };
  return { ...base, ...overrides, reads };
}

function run(d: AuthCallbackDeps): Promise<Response> {
  const request = new Request('https://portal.example.test/auth/callback?code=c&state=s', {
    headers: { Cookie: 'oauth_state=s' },
  });
  return withRequestContext({ requestId: REQUEST_ID, token: '' }, () =>
    handleAuthCallback(request, d)
  );
}

describe('handleAuthCallback', () => {
  let debugSpy: MockInstance;
  let warnSpy: MockInstance;
  let errorSpy: MockInstance;

  beforeEach(() => {
    debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    debugSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('redirects home without authenticating when a session already exists', async () => {
    const d = deps({
      getSession: vi.fn(async () => ({
        session: { sub: SUB },
        headers: cookieHeaders('_session=x'),
      })),
    });

    const response = await run(d);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(paths.home);
    expect(response.headers.getSetCookie()).toEqual(['_session=x']);
    expect(d.authenticate).not.toHaveBeenCalled();
  });

  test('sets session, refresh and id-token cookies and redirects to the fallback', async () => {
    const d = deps();

    const response = await run(d);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(paths.account.organizations.root);
    expect(response.headers.getSetCookie()).toEqual([
      '_session=new',
      '_refresh_token=new',
      '_id_token=new',
    ]);
    expect(d.setSession).toHaveBeenCalledWith('oauth_state=s', {
      accessToken: ACCESS_TOKEN,
      expiredAt: new Date('2030-01-01T00:00:00Z'),
      sub: SUB,
      emailVerified: true,
    });
    expect(d.readEmailVerified).toHaveBeenCalledWith('id-1');
    expect(d.setRefreshToken).toHaveBeenCalledWith('oauth_state=s', 'refresh-1');
    expect(d.clearRedirectIntent).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalledWith(
      '[auth] callback received tokens',
      expect.objectContaining({ requestId: REQUEST_ID, hasRefreshToken: true })
    );
  });

  test('redirects to a reachable saved intent and clears it', async () => {
    const d = deps({
      getRedirectIntent: vi.fn(async () => ({ path: '/org/acme/projects', sub: SUB })),
    });

    const response = await run(d);

    expect(response.headers.get('Location')).toBe('/org/acme/projects');
    expect(d.accessFor).toHaveBeenCalledWith(ACCESS_TOKEN, SUB);
    expect(d.reads.getOrganization).toHaveBeenCalledWith('acme');
    expect(d.clearRedirectIntent).toHaveBeenCalledTimes(1);
    expect(response.headers.getSetCookie()).toContain('_redirect_intent=; Max-Age=0');
  });

  test('clears an unreachable saved intent and falls back', async () => {
    const reads = access(false);
    const d = deps({
      getRedirectIntent: vi.fn(async () => ({ path: '/project/secret-1', sub: SUB })),
      accessFor: vi.fn(() => reads),
    });

    const response = await run(d);

    expect(response.headers.get('Location')).toBe(paths.account.organizations.root);
    expect(d.clearRedirectIntent).toHaveBeenCalledTimes(1);
  });

  test('clears an intent saved for another user and falls back', async () => {
    const d = deps({
      getRedirectIntent: vi.fn(async () => ({ path: '/org/acme', sub: 'someone-else' })),
    });

    const response = await run(d);

    expect(response.headers.get('Location')).toBe(paths.account.organizations.root);
    expect(d.reads.getOrganization).not.toHaveBeenCalled();
    expect(d.clearRedirectIntent).toHaveBeenCalledTimes(1);
  });

  test('keeps an allow-listed website return URL', async () => {
    const d = deps({
      getRedirectIntent: vi.fn(async () => ({ path: 'https://www.datum.net/pricing', sub: SUB })),
    });

    const response = await run(d);

    expect(response.headers.get('Location')).toBe('https://www.datum.net/pricing');
  });

  test('still signs in without a refresh token and logs a warning', async () => {
    const d = deps({ authenticate: vi.fn(async () => credentials({ refreshToken: undefined })) });

    const response = await run(d);

    expect(response.headers.get('Location')).toBe(paths.account.organizations.root);
    expect(d.setRefreshToken).not.toHaveBeenCalled();
    expect(response.headers.getSetCookie()).toEqual(['_session=new', '_id_token=new']);
    expect(warnSpy).toHaveBeenCalledWith('[auth] callback received no refresh token from Zitadel', {
      requestId: REQUEST_ID,
    });
  });

  test('skips the id-token cookie when no id token is returned', async () => {
    const d = deps({ authenticate: vi.fn(async () => credentials({ idToken: undefined })) });

    const response = await run(d);

    expect(d.setIdTokenSession).not.toHaveBeenCalled();
    expect(response.headers.getSetCookie()).toEqual(['_session=new', '_refresh_token=new']);
  });

  test('redirects to login and logs the error when authenticate throws', async () => {
    const failure = new Error('ALREADY_DONE');
    const d = deps({
      authenticate: vi.fn(async () => {
        throw failure;
      }),
    });

    const response = await run(d);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe(paths.auth.logIn);
    expect(response.headers.getSetCookie()).toEqual([]);
    expect(d.setSession).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('[auth] callback authenticate failed', failure, {
      requestId: REQUEST_ID,
    });
  });

  test('redirects to login when authenticate returns no credentials', async () => {
    const d = deps({ authenticate: vi.fn(async () => undefined) });

    const response = await run(d);

    expect(response.headers.get('Location')).toBe(paths.auth.logIn);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect((errorSpy.mock.calls[0][1] as Error).message).toBe('Authentication failed');
  });

  test('redirects to login when a cookie write fails', async () => {
    const d = deps({
      setSession: vi.fn(async () => {
        throw new Error('cookie too large');
      }),
    });

    const response = await run(d);

    expect(response.headers.get('Location')).toBe(paths.auth.logIn);
    expect(d.getRedirectIntent).not.toHaveBeenCalled();
  });
});
