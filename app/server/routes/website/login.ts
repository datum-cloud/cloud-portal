import { authenticator } from '@/modules/auth/auth.server';
import { rateLimiter } from '@/server/middleware/rate-limit';
import type { Variables } from '@/server/types';
import {
  clearRedirectIntent,
  isValidRedirectTarget,
  setRedirectIntent,
} from '@/utils/cookies/redirect-intent.server';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';

const MAX_RETURN_TO_LENGTH = 2048;
const LOGIN_REQUESTS_PER_MINUTE = 30;

export interface WebsiteLoginRouteOptions {
  origins?: string[];
  appUrl?: string;
}

function appendSetCookies(from: Headers, to: Headers) {
  from.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') to.append('Set-Cookie', value);
  });
}

/**
 * `GET /api/website/login` — the target of datum.net's sign-in links.
 *
 * This is a top-level browser navigation (an `<a href>`, not a `fetch`), so it
 * carries no `Origin` header and can never satisfy the website group's CORS
 * middleware. It is mounted directly on the parent app instead, outside that
 * group, and re-implements just enough of the group's origin allowlisting to
 * decide whether `returnTo` is safe to remember.
 *
 * It starts the OIDC flow itself rather than redirecting to a portal page:
 * every portal page sits behind the private layout, whose guard
 * (`isAuthenticated`) overwrites `_redirect_intent` with its own path before
 * bouncing an anonymous visitor to Zitadel, which would lose the website URL.
 */
export function createWebsiteLoginRoute(options: WebsiteLoginRouteOptions = {}) {
  const origins = options.origins ?? env.server.websiteOrigins;
  const appUrl = (options.appUrl ?? env.public.appUrl).replace(/\/+$/, '');

  const login = new Hono<{ Variables: Variables }>();

  // Mounted outside the website group, so `trafficClassLimiter` never sees this
  // route. It is unauthenticated and every call starts an OIDC handshake and
  // writes cookies, so it carries a budget of its own.
  login.use('*', rateLimiter({ limit: LOGIN_REQUESTS_PER_MINUTE }));

  login.get('/', async (c) => {
    const returnTo = c.req.query('returnTo') ?? '';

    if (
      returnTo.length > MAX_RETURN_TO_LENGTH ||
      !returnTo.startsWith('http') ||
      !isValidRedirectTarget(returnTo, origins)
    ) {
      return c.redirect(`${appUrl}/`, 302);
    }

    // Signed-in visitors skip OIDC: `/auth/callback` sends anyone with a
    // session to the portal home before reading the intent.
    if (c.get('session')) return c.redirect(returnTo, 302);

    const { headers: intentHeaders } = await setRedirectIntent(c.req.raw, returnTo);

    const url = new URL(c.req.url);
    url.search = '';

    try {
      await authenticator.authenticate('zitadel', new Request(url.toString(), c.req.raw));
    } catch (error) {
      if (error instanceof Response) {
        appendSetCookies(intentHeaders, error.headers);
        return error;
      }
      throw error;
    }

    // Defensive fallback only: signed-in visitors take the session check
    // above. Should `authenticate` ever resolve, return to the website.
    const { headers: clearHeaders } = await clearRedirectIntent(c.req.raw);
    const res = c.redirect(returnTo, 302);
    appendSetCookies(clearHeaders, res.headers);
    return res;
  });

  return login;
}
