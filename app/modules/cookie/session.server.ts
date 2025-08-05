import { paths } from '@/config/paths';
import { authenticator } from '@/modules/auth/auth.server';
import { zitadelStrategy } from '@/modules/auth/strategies/zitadel.server';
import { IAuthSession } from '@/resources/interfaces/auth.interface';
import { isProduction } from '@/utils/environment';
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
 * Gets authentication session data
 * @param request Request object
 * @returns Response with session data and headers
 */
export async function getSession(request: Request): Promise<SessionResponse> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  const sessionData = session.get(SESSION_KEY);
  const cookieHeader = await sessionStorage.commitSession(session);

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

    // Generate a new request without search params
    const url = new URL(request.url);
    url.search = '';

    // Redirect to OIDC Page
    return authenticator.authenticate('zitadel', new Request(url.toString(), request));
  } else {
    // Convert expiredAt to timestamp
    const tokenExpiryTime = new Date(session.expiredAt).getTime();

    // Check if session is expired
    if (tokenExpiryTime < Date.now()) {
      return redirect(paths.auth.logOut, {
        headers: currentHeaders,
      });
    }

    // Only refresh token if it's about to expire (e.g., within 5 minutes)
    const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = tokenExpiryTime - currentTime;

    // Refresh token only if it's about to expire (within 5 minutes) or already expired
    if (session.refreshToken && timeUntilExpiry < FIVE_MINUTES) {
      try {
        const refreshSession = await zitadelStrategy.refreshToken(session.refreshToken);

        const { headers: sessionHeaders } = await setSession(request, {
          accessToken: refreshSession.accessToken(),
          refreshToken: refreshSession.refreshToken(),
          expiredAt: refreshSession.accessTokenExpiresAt(),
        });

        currentHeaders = sessionHeaders;
      } catch (error) {
        console.error('Refresh token failed:', error);
        // If refresh fails, log the user out
        return redirect(paths.auth.logOut, {
          headers: currentHeaders,
        });
      }
    }

    if (redirectTo) {
      return redirect(redirectTo, { headers: currentHeaders });
    }

    return true;
  }
}
