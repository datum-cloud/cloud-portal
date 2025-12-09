import { authenticator } from '@/modules/auth/auth.server';
import { zitadelStrategy } from '@/modules/auth/strategies/zitadel.server';
import { IAuthSession } from '@/resources/interfaces/auth.interface';
import { isProduction } from '@/utils/config/env.config';
import { paths } from '@/utils/config/paths.config';
import { setRedirectIntent } from '@/utils/cookies/redirect-intent.server';
import { getRefreshedSession, setRefreshedSession } from '@/utils/middlewares/middleware';
import { cache } from 'react';
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
  // Check if there's a refreshed session in context (from isAuthenticated)
  const refreshedSession = getRefreshedSession(request);
  if (refreshedSession) {
    // Use the refreshed session data and get headers from it
    const session = await sessionStorage.getSession(request.headers.get('Cookie'));
    // Set the refreshed session data
    session.set(SESSION_KEY, refreshedSession);
    const cookieHeader = await sessionStorage.commitSession(session);
    return createSessionResponse(refreshedSession, cookieHeader);
  }

  // Otherwise, read from cookies as normal
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
 * Result type for isAuthenticated when user is authenticated
 */
export type AuthenticatedResult = {
  authenticated: true;
  headers: Headers;
};

/**
 * Type guard to check if a value is an AuthenticatedResult
 */
export function isAuthenticatedResult(value: unknown): value is AuthenticatedResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'authenticated' in value &&
    (value as AuthenticatedResult).authenticated === true &&
    'headers' in value &&
    (value as AuthenticatedResult).headers instanceof Headers
  );
}

/**
 * In-flight refresh operations map to prevent concurrent refreshes
 * Key: refresh token, Value: Promise that resolves when refresh completes
 */
const refreshLocks = new Map<string, Promise<IAuthSession>>();

/**
 * Internal implementation of isAuthenticated (wrapped with cache to prevent duplicate token refreshes)
 */
const _isAuthenticated = async (
  request: Request,
  redirectTo?: string,
  noAuthRedirect?: boolean
): Promise<Response | AuthenticatedResult> => {
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
    // The authenticator throws a redirect Response when not authenticated, so we need to catch it
    try {
      await authenticator.authenticate('zitadel', new Request(url.toString(), request));
      // If we get here, authentication succeeded (shouldn't happen in this flow)
      // But TypeScript requires handling this case
      // In practice, authenticate throws a Response redirect when not authenticated
      return redirect(paths.auth.logOut, {
        headers: redirectIntentHeaders,
      });
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
    // Convert expiredAt to timestamp
    const tokenExpiryTime = new Date(session.expiredAt).getTime();

    // Check if session is expired
    if (tokenExpiryTime < Date.now()) {
      return redirect(paths.auth.logOut, {
        headers: currentHeaders,
      });
    }

    // Only refresh token if it's about to expire
    const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = tokenExpiryTime - currentTime;

    if (session.refreshToken && timeUntilExpiry < FIVE_MINUTES) {
      // First, check if there's already a refreshed session in the context
      // This handles the case where another call in the same request already refreshed
      const alreadyRefreshed = getRefreshedSession(request);
      if (alreadyRefreshed) {
        const refreshedExpiryTime = new Date(alreadyRefreshed.expiredAt).getTime();
        const refreshedTimeUntilExpiry = refreshedExpiryTime - Date.now();
        // Only use the refreshed session if it's still valid and not about to expire
        if (refreshedTimeUntilExpiry >= FIVE_MINUTES) {
          const { headers: refreshedHeaders } = await getSession(request);
          currentHeaders = refreshedHeaders;
          // Skip refresh since we already have a valid refreshed session
          if (redirectTo) {
            return redirect(redirectTo, { headers: currentHeaders });
          }
          return { authenticated: true, headers: currentHeaders };
        }
        // The refreshed session is also about to expire, continue with refresh
      }

      const refreshToken = session.refreshToken;

      // Check if there's already a refresh in progress for this token
      let refreshPromise = refreshLocks.get(refreshToken);

      if (!refreshPromise) {
        // No refresh in progress, start a new one
        refreshPromise = (async (): Promise<IAuthSession> => {
          try {
            const refreshSession = await zitadelStrategy.refreshToken(refreshToken);

            const refreshedSessionData = {
              ...session,
              accessToken: refreshSession.accessToken(),
              refreshToken: refreshSession.refreshToken(),
              expiredAt: refreshSession.accessTokenExpiresAt(),
            };

            // Store refreshed session in context so getSession can use it
            setRefreshedSession(request, refreshedSessionData);

            const { headers: sessionHeaders } = await setSession(request, refreshedSessionData);

            currentHeaders = sessionHeaders;

            // Update the lock to use the new refresh token
            // This prevents concurrent calls with the new token from refreshing again
            const newRefreshToken = refreshedSessionData.refreshToken;
            if (newRefreshToken && newRefreshToken !== refreshToken) {
              refreshLocks.set(newRefreshToken, Promise.resolve(refreshedSessionData));
            }

            // Clean up the old lock after a delay
            setTimeout(() => {
              refreshLocks.delete(refreshToken);
            }, 1000);

            return refreshedSessionData;
          } catch (error) {
            // Remove lock on error so retry is possible
            refreshLocks.delete(refreshToken);
            throw error;
          }
        })();

        // Store the refresh promise in the lock map
        refreshLocks.set(refreshToken, refreshPromise);
      }

      // Wait for refresh to complete (either the one we started or an existing one)
      try {
        const refreshedSessionData = await refreshPromise;

        // Verify the refreshed session is valid
        if (!refreshedSessionData || !refreshedSessionData.accessToken) {
          return redirect(paths.auth.logOut, {
            headers: currentHeaders,
          });
        }

        // Update the session variable to use the refreshed data
        // This ensures we're working with the latest token
        const refreshedExpiryTime = new Date(refreshedSessionData.expiredAt).getTime();
        if (refreshedExpiryTime < Date.now()) {
          // Refreshed token is already expired, log out
          return redirect(paths.auth.logOut, {
            headers: currentHeaders,
          });
        }

        // Double-check that the refreshed session is in context
        // This ensures getSession will return the refreshed data
        const contextRefreshed = getRefreshedSession(request);
        if (
          !contextRefreshed ||
          contextRefreshed.accessToken !== refreshedSessionData.accessToken
        ) {
          // If not in context, set it again (shouldn't happen, but defensive)
          setRefreshedSession(request, refreshedSessionData);
        }

        // Update headers from the refreshed session
        const { headers: refreshedHeaders } = await getSession(request);
        currentHeaders = refreshedHeaders;
      } catch (error) {
        console.log('Refresh token failed:', error);
        // If refresh fails, log the user out
        return redirect(paths.auth.logOut, {
          headers: currentHeaders,
        });
      }
    }

    if (redirectTo) {
      return redirect(redirectTo, { headers: currentHeaders });
    }

    return { authenticated: true, headers: currentHeaders };
  }
};

/**
 * Checks if the user is authenticated and redirects to the login page if not
 * Wrapped with cache to prevent duplicate token refresh calls when
 * multiple loaders call this function in parallel during the same request.
 *
 * @param request Request object
 * @param redirectTo Optional redirect URL
 * @param noAuthRedirect Optional flag to redirect to the login page if the user is not authenticated
 * @returns Response with redirect, or AuthenticatedResult with headers (including refreshed token headers)
 */
export const isAuthenticated = cache(_isAuthenticated);
