import { authenticator } from '@/modules/auth/auth.server';
import { zitadelStrategy } from '@/modules/auth/strategies/zitadel.server';
import { IAuthSession } from '@/resources/interfaces/auth.interface';
import { isProduction } from '@/utils/config/env.config';
import { paths } from '@/utils/config/paths.config';
import { setRedirectIntent } from '@/utils/cookies/redirect-intent.server';
import { createCookie, createCookieSessionStorage, redirect } from 'react-router';

/**
 * Session key for the session cookie
 */
export const SESSION_KEY = '_session';

/**
 * Session cookie configuration
 */
export const sessionCookie = createCookie(SESSION_KEY, {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 1, // 1 days
  secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
  secure: isProduction(),
});

/**
 * Creates a session storage based on the cookie.
 */
export const sessionStorage = createCookieSessionStorage({
  cookie: sessionCookie,
});

/**
 * Type for the response object from auth session operations
 */
type SessionResponse = {
  session?: IAuthSession;
  headers: Headers;
};

/**
 * Creates a session response with the provided data and cookie header
 * @param sessionData Session data to include in the response
 * @param cookieHeader Cookie header value
 * @returns Response object with session data and headers
 */
const createSessionResponse = (
  sessionData: IAuthSession | undefined,
  cookieHeader: string
): SessionResponse => ({
  ...(sessionData ? { session: sessionData } : {}),
  headers: new Headers({
    'Set-Cookie': cookieHeader,
  }),
});

/**
 * Sets authentication session data
 * @param request Request object
 * @param sessionData Session data to store
 * @returns Response with session data and headers
 */
export async function setSession(
  request: Request,
  sessionData: IAuthSession
): Promise<SessionResponse> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  session.set(SESSION_KEY, sessionData);
  const cookieHeader = await sessionStorage.commitSession(session);

  return createSessionResponse(sessionData, cookieHeader);
}

/**
 * Gets authentication session data with automatic token refresh if needed
 * @param request Request object
 * @returns Response with session data (refreshed if necessary) and headers
 */
export async function getSession(request: Request): Promise<SessionResponse> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  let sessionData = session.get(SESSION_KEY);
  let cookieHeader = await sessionStorage.commitSession(session);

  // Parse date strings back to Date objects
  if (sessionData && typeof sessionData.expiredAt === 'string') {
    sessionData.expiredAt = new Date(sessionData.expiredAt);
  }

  // Check if session is expired
  if (sessionData) {
    const tokenExpiryTime = new Date(sessionData.expiredAt).getTime();
    if (tokenExpiryTime < Date.now()) {
      return createSessionResponse(undefined, cookieHeader);
    }

    // Refresh token if it expires within the next 5 minutes
    const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
    const timeUntilExpiry = tokenExpiryTime - Date.now();

    if (sessionData.refreshToken && timeUntilExpiry < REFRESH_THRESHOLD) {
      try {
        const refreshSession = await zitadelStrategy.refreshToken(sessionData.refreshToken);

        const refreshedSession: IAuthSession = {
          accessToken: refreshSession.accessToken(),
          refreshToken: refreshSession.refreshToken(),
          expiredAt: refreshSession.accessTokenExpiresAt(),
          sub: sessionData.sub,
          idToken: sessionData.idToken,
        };

        // Update the session in cookies
        const updatedSession = await sessionStorage.getSession(request.headers.get('Cookie'));
        updatedSession.set(SESSION_KEY, refreshedSession);
        cookieHeader = await sessionStorage.commitSession(updatedSession);
        sessionData = refreshedSession;
      } catch (error) {
        console.error('Token refresh failed:', error);
        return createSessionResponse(undefined, cookieHeader);
      }
    }
  }

  return createSessionResponse(sessionData, cookieHeader);
}

/**
 * Destroys the authentication session
 * @param request Request object
 * @returns Response with headers for destroying the session
 */
export async function destroySession(request: Request): Promise<SessionResponse> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  const cookieHeader = await sessionStorage.destroySession(session);

  return createSessionResponse(undefined, cookieHeader);
}

/**
 * Checks if the user is authenticated and redirects to the login page if not
 * @param request Request object
 * @param redirectTo Optional redirect URL
 * @param noAuthRedirect Optional flag to redirect to the login page if the user is not authenticated
 * @returns Response with either a redirect to the login page or the original request
 */
export async function isAuthenticated(
  request: Request,
  redirectTo?: string,
  noAuthRedirect?: boolean
) {
  const { session, headers } = await getSession(request);
  let currentHeaders = headers;

  if (!session) {
    if (noAuthRedirect) {
      return redirect(paths.auth.logOut, {
        headers: currentHeaders,
      });
    }

    // Save the current URL (path + search + hash) for post-login redirect
    const url = new URL(request.url);
    const redirectPath = url.pathname + url.search + url.hash;
    const { headers: redirectIntentHeaders } = await setRedirectIntent(request, redirectPath);

    // Generate a new request without search params
    url.search = '';

    // Redirect to OIDC Page and include the redirect intent cookie in the response
    // The authenticator throws a redirect Response, so we need to catch it
    try {
      const authResponse = await authenticator.authenticate(
        'zitadel',
        new Request(url.toString(), request)
      );
      return authResponse;
    } catch (error) {
      // If the authenticator throws a Response (redirect), add our cookie to it
      if (error instanceof Response) {
        const setCookieHeader = redirectIntentHeaders.get('Set-Cookie');
        if (setCookieHeader) {
          error.headers.append('Set-Cookie', setCookieHeader);
        }
        throw error; // Re-throw the modified response
      }
      // If it's not a Response, re-throw the error
      throw error;
    }
  } else {
    // Session is valid and token has been refreshed (if needed) by getSession()
    if (redirectTo) {
      return redirect(redirectTo, { headers: currentHeaders });
    }

    return true;
  }
}
