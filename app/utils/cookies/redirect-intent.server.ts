import { env } from '@/utils/env/env.server';
import { createCookie, createCookieSessionStorage } from 'react-router';

/**
 * Session key for the redirect_intent cookie
 */
export const REDIRECT_INTENT_KEY = '_redirect_intent';

/**
 * Redirect intent cookie configuration
 * Short-lived cookie (1 hour) to store the user's intended destination
 * before being redirected to the OAuth provider
 */
export const redirectIntentCookie = createCookie(REDIRECT_INTENT_KEY, {
  path: '/',
  domain: new URL(env.public.appUrl).hostname,
  sameSite: 'lax',
  httpOnly: true,
  maxAge: 60 * 60, // 1 hour (enough for OAuth flow)
  secrets: [env.server.sessionSecret],
  secure: env.isProd,
});

/**
 * Creates a session storage based on the redirect_intent cookie.
 */
export const redirectIntentSessionStorage = createCookieSessionStorage({
  cookie: redirectIntentCookie,
});

/**
 * Type for the response object from redirect_intent session operations
 */
type RedirectIntentSessionResponse = {
  path?: string;
  headers: Headers;
};

/**
 * Creates a session response with the provided redirect path and cookie header
 * @param path Redirect path to include in the response
 * @param cookieHeader Cookie header value
 * @returns Response object with path and headers
 */
const createRedirectIntentSessionResponse = (
  path: string | undefined,
  cookieHeader: string
): RedirectIntentSessionResponse => ({
  ...(path ? { path } : {}),
  headers: new Headers({
    'Set-Cookie': cookieHeader,
  }),
});

/**
 * Sets redirect intent path in the cookie-based session
 * @param request Request object
 * @param path Redirect path to store (full path including search and hash)
 * @returns Response with path and session headers
 */
export async function setRedirectIntent(
  request: Request,
  path: string
): Promise<RedirectIntentSessionResponse> {
  const session = await redirectIntentSessionStorage.getSession(request.headers.get('Cookie'));
  session.set(REDIRECT_INTENT_KEY, path);
  const cookieHeader = await redirectIntentSessionStorage.commitSession(session);
  return createRedirectIntentSessionResponse(path, cookieHeader);
}

/**
 * Gets redirect intent path from the cookie-based session
 * @param request Request object
 * @returns Response with path and session headers
 */
export async function getRedirectIntent(request: Request): Promise<RedirectIntentSessionResponse> {
  const session = await redirectIntentSessionStorage.getSession(request.headers.get('Cookie'));
  const path = session.get(REDIRECT_INTENT_KEY);
  const cookieHeader = await redirectIntentSessionStorage.commitSession(session);
  return createRedirectIntentSessionResponse(path, cookieHeader);
}

/**
 * Destroys the redirect_intent session (one-time consumption)
 * @param request Request object
 * @returns Response with headers for destroying the redirect_intent session
 */
export async function clearRedirectIntent(
  request: Request
): Promise<RedirectIntentSessionResponse> {
  const session = await redirectIntentSessionStorage.getSession(request.headers.get('Cookie'));
  const cookieHeader = await redirectIntentSessionStorage.destroySession(session);
  return createRedirectIntentSessionResponse(undefined, cookieHeader);
}

/**
 * Validates if a redirect path is safe to use
 * @param path Path to validate
 * @returns true if the path is safe to redirect to
 */
export function isValidRedirectPath(path: string): boolean {
  // Only allow relative paths (no external domains)
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    return false;
  }

  // Must start with /
  if (!path.startsWith('/')) {
    return false;
  }

  // Exclude auth routes to prevent redirect loops
  if (path.startsWith('/auth/') || path.startsWith('/login') || path.startsWith('/logout')) {
    return false;
  }

  return true;
}
