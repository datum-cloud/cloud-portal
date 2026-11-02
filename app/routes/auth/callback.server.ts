/**
 * The OIDC callback, with every cookie, token and upstream read passed in so
 * each branch can be unit-tested (callback.test.ts). `callback.tsx` wires the
 * real implementations; this module imports none of them.
 */
import { resolveReturnTo, type ReturnToAccess } from './post-login-access';
import { getRequestContext } from '@/modules/axios/request-context';
import { logger } from '@/modules/logger';
import type { IAccessTokenSession, IAuthSession } from '@/utils/auth/auth.types';
import { paths } from '@/utils/config/paths.config';
import { AuthenticationError } from '@/utils/errors';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { jwtDecode } from 'jwt-decode';
import { redirect } from 'react-router';

export interface AuthCallbackDeps {
  getSession: (request: Request) => Promise<{ session?: unknown; headers: Headers }>;
  authenticate: (request: Request) => Promise<IAuthSession | undefined>;
  setSession: (cookieHeader: string | null, session: IAccessTokenSession) => Promise<Headers>;
  setRefreshToken: (cookieHeader: string | null, refreshToken: string) => Promise<Headers>;
  readEmailVerified: (idToken: string | null | undefined) => boolean;
  setIdTokenSession: (request: Request, idToken: string) => Promise<{ headers: Headers }>;
  getRedirectIntent: (
    request: Request
  ) => Promise<{ path?: string | null; sub?: string | null } | null | undefined>;
  clearRedirectIntent: (request: Request) => Promise<{ headers: Headers }>;
  /** Absolute website origins a saved intent may point at. */
  allowedOrigins: string[];
  /** Org and project reads made with the access token that was just issued. */
  accessFor: (accessToken: string, sub: string) => ReturnToAccess;
}

function requestId(): string | undefined {
  return getRequestContext()?.requestId;
}

export async function handleAuthCallback(
  request: Request,
  deps: AuthCallbackDeps
): Promise<Response> {
  try {
    const session = await deps.getSession(request);

    // Redirect if already authenticated
    if (session.session) {
      return redirect(paths.home, { headers: session.headers });
    }

    // Authenticate user
    const credentials = await deps.authenticate(request);
    if (!credentials) {
      throw new AuthenticationError('Authentication failed');
    }

    const { idToken, refreshToken, ...rest } = credentials;

    const cookieHeader = request.headers.get('Cookie');

    logger.debug('[auth] callback received tokens', {
      requestId: requestId(),
      hasAccessToken: !!rest.accessToken,
      hasIdToken: !!idToken,
      hasRefreshToken: !!refreshToken,
      expiredAt: rest.expiredAt,
    });

    // Decode Access token to get sub
    const decoded = jwtDecode<{ sub: string; email: string }>(rest.accessToken);

    // Handle access token session (short-lived cookie)
    const sessionHeaders = await deps.setSession(cookieHeader, {
      accessToken: rest.accessToken,
      expiredAt: rest.expiredAt,
      sub: decoded.sub,
      emailVerified: deps.readEmailVerified(idToken),
    });

    // Handle refresh token (long-lived cookie) - SEPARATE from session
    let refreshTokenHeaders: Headers | undefined;
    if (refreshToken) {
      logger.debug('[auth] callback storing refresh token in cookie', { requestId: requestId() });
      refreshTokenHeaders = await deps.setRefreshToken(cookieHeader, refreshToken);
    } else {
      logger.warn('[auth] callback received no refresh token from Zitadel', {
        requestId: requestId(),
      });
    }

    // Handle id token session
    let idTokenHeaders: Headers | undefined;
    if (idToken) {
      const idTokenResponse = await deps.setIdTokenSession(request, idToken);
      idTokenHeaders = idTokenResponse.headers;
    }

    // Combine all headers
    let headers = combineHeaders(sessionHeaders, refreshTokenHeaders, idTokenHeaders);

    // Get the intended redirect destination: restored only for the same user
    // and when the new access token can reach it.
    const redirectIntent = await deps.getRedirectIntent(request);
    const destination = await resolveReturnTo({
      intentPath: redirectIntent?.path,
      intentSub: redirectIntent?.sub,
      sub: decoded.sub,
      allowedOrigins: deps.allowedOrigins,
      fallback: paths.account.organizations.root,
      access: deps.accessFor(rest.accessToken, decoded.sub),
    });

    if (redirectIntent?.path) {
      // Clear the redirect intent (one-time use)
      const clearHeaders = await deps.clearRedirectIntent(request);
      headers = combineHeaders(headers, clearHeaders.headers);
    }

    // Redirect to the intended destination
    return redirect(destination, { headers });
  } catch (error) {
    // Surface the real reason the OAuth callback failed instead of silently bouncing to
    // login (which caused an invisible re-authorize loop → Zitadel ALREADY_DONE).
    logger.error(
      '[auth] callback authenticate failed',
      error instanceof Error ? error : new Error(String(error)),
      { requestId: requestId() }
    );
    return redirect(paths.auth.logIn);
  }
}
