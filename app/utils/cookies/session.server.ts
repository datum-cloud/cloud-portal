/**
 * Session cookie utilities
 *
 * This module provides session cookie management and the isAuthenticated helper.
 * Core auth logic (refresh, validation) is handled by AuthService.
 */
import { authenticator } from '@/modules/auth/auth.server';
import { AUTH_COOKIE_KEYS, AuthService, sessionStorage } from '@/utils/auth';
import type { IAccessTokenSession } from '@/utils/auth';
import { paths } from '@/utils/config/paths.config';
import { setRedirectIntent } from '@/utils/cookies/redirect-intent.server';
import { redirect } from 'react-router';

// Re-export for backwards compatibility
export { sessionStorage };
export const SESSION_KEY = AUTH_COOKIE_KEYS.SESSION;

/**
 * Type for the response object from auth session operations
 */
type SessionResponse = {
  session?: IAccessTokenSession;
  headers: Headers;
};

/**
 * Sets authentication session data
 * @param request Request object
 * @param sessionData Session data to store
 * @returns Response with session data and headers
 */
export async function setSession(
  request: Request,
  sessionData: IAccessTokenSession
): Promise<SessionResponse> {
  const headers = await AuthService.setSession(request.headers.get('Cookie'), sessionData);
  return { session: sessionData, headers };
}

/**
 * Gets authentication session data (simple read, no refresh)
 *
 * Note: Token refresh is handled centrally in server.ts apiContext().
 * This function only reads the current session without triggering refresh
 * to avoid race conditions with concurrent requests.
 *
 * @param request Request object
 * @returns Response with session data and headers
 */
export async function getSession(request: Request): Promise<SessionResponse> {
  const { session, rawSession } = await AuthService.getSession(request.headers.get('Cookie'));
  const cookieHeader = await sessionStorage.commitSession(rawSession);

  return {
    session: session ?? undefined,
    headers: new Headers({ 'Set-Cookie': cookieHeader }),
  };
}

/**
 * Destroys the authentication session
 * @param request Request object
 * @returns Response with headers for destroying the session
 */
export async function destroySession(request: Request): Promise<SessionResponse> {
  const headers = await AuthService.destroySession(request.headers.get('Cookie'));
  return { session: undefined, headers };
}

/**
 * Checks if the user is authenticated and redirects to the login page if not
 *
 * Note: Token refresh is handled centrally in server.ts apiContext().
 * This function only checks the current session without triggering refresh
 * to avoid race conditions with concurrent requests.
 *
 * @param request Request object
 * @param redirectTo Optional redirect URL after successful auth
 * @param noAuthRedirect If true, redirects to logout instead of login when not authenticated
 * @returns Response with either a redirect or true if authenticated
 */
export async function isAuthenticated(
  request: Request,
  redirectTo?: string,
  noAuthRedirect?: boolean
) {
  const { session, rawSession } = await AuthService.getSession(request.headers.get('Cookie'));
  const cookieHeader = await sessionStorage.commitSession(rawSession);
  const headers = new Headers({ 'Set-Cookie': cookieHeader });

  // Not authenticated
  if (!session) {
    if (noAuthRedirect) {
      return redirect(paths.auth.logOut, { headers });
    }

    // Save the current URL for post-login redirect
    const url = new URL(request.url);
    const redirectPath = url.pathname + url.search + url.hash;
    const { headers: redirectIntentHeaders } = await setRedirectIntent(request, redirectPath);

    // Clear search params for auth redirect
    url.search = '';

    try {
      const authResponse = await authenticator.authenticate(
        'zitadel',
        new Request(url.toString(), request)
      );
      return authResponse;
    } catch (error) {
      if (error instanceof Response) {
        // Add redirect intent cookie to the response
        const setCookieHeader = redirectIntentHeaders.get('Set-Cookie');
        if (setCookieHeader) {
          error.headers.append('Set-Cookie', setCookieHeader);
        }
        // Also append session headers
        headers.forEach((value: string, key: string) => {
          if (key.toLowerCase() === 'set-cookie') {
            (error as any).headers.append('Set-Cookie', value);
          }
        });
        throw error;
      }
      throw error;
    }
  }

  // Authenticated - redirect if requested
  if (redirectTo) {
    return redirect(redirectTo, { headers });
  }

  return true;
}
