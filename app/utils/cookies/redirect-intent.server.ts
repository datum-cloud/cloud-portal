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
 * The portal's own origin, used to decide whether a relative redirect target
 * stays on this site once a browser resolves it.
 */
const APP_ORIGIN = new URL(env.public.appUrl).origin;

/**
 * Validates if a redirect target is safe to use: either a relative internal
 * path, or an absolute URL whose origin is on the allowlist (the website's
 * sign-in links send an absolute `returnTo`, since they navigate from a
 * different origin than cloud-portal).
 *
 * Relative targets are resolved against {@link APP_ORIGIN} rather than checked
 * by prefix. Prefix matching cannot enumerate every off-site spelling: `//`,
 * `/\`, `/\/` and `/\@` all parse as an authority under the WHATWG rules that
 * browsers follow, so only a real parse rejects all of them.
 *
 * @param target Path or absolute URL to validate
 * @param allowedOrigins Absolute-URL origins allowed as redirect targets
 * @returns true if the target is safe to redirect to
 */
export function isValidRedirectTarget(target: string, allowedOrigins: string[]): boolean {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    try {
      const url = new URL(target);
      return url.username === '' && url.password === '' && allowedOrigins.includes(url.origin);
    } catch {
      return false;
    }
  }

  if (!target.startsWith('/')) return false;

  let resolved: URL;
  try {
    resolved = new URL(target, APP_ORIGIN);
  } catch {
    return false;
  }
  if (resolved.origin !== APP_ORIGIN) return false;

  // Exclude auth routes to prevent redirect loops. Checked against the parsed
  // pathname so encoded or dot-segment spellings normalize first.
  const path = resolved.pathname;
  if (path.startsWith('/auth/') || path.startsWith('/login') || path.startsWith('/logout')) {
    return false;
  }

  return true;
}

/**
 * Backwards-compatible alias: relative internal paths only, no absolute
 * website URLs allowed.
 * @param path Path to validate
 * @returns true if the path is safe to redirect to
 */
export function isValidRedirectPath(path: string): boolean {
  return isValidRedirectTarget(path, []);
}
