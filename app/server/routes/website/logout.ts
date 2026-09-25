import { zitadelIssuer } from '@/modules/auth/strategies/zitadel.server';
import { rateLimiter } from '@/server/middleware/rate-limit';
import type { Variables } from '@/server/types';
import { AuthService, destroyAllAuthCookies, destroyLocalSessions } from '@/utils/auth';
import { buildEndSessionUrl } from '@/utils/auth/auth.service';
import { getIdTokenSession } from '@/utils/cookies';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';

const LOGOUT_REQUESTS_PER_MINUTE = 30;

export interface WebsiteLogoutRouteOptions {
  appUrl?: string;
  postLogoutRedirectUri?: string;
}

/**
 * `GET /api/website/logout` — the target of datum.net's sign-out links.
 *
 * Like `/login`, this is a top-level browser navigation (an `<a href>`, not a
 * `fetch`), so it carries no `Origin` header and can never satisfy the website
 * group's CORS middleware. It is mounted directly on the parent app instead.
 *
 * It mirrors the portal's own `/auth/logout`: revoke the tokens back-channel,
 * then send the browser through Zitadel's end_session so the SSO session is
 * ended too. The only difference is where the browser lands afterwards.
 */
export function createWebsiteLogoutRoute(options: WebsiteLogoutRouteOptions = {}) {
  const appUrl = (options.appUrl ?? env.public.appUrl).replace(/\/+$/, '');
  const postLogoutRedirectUri =
    options.postLogoutRedirectUri ?? env.server.websitePostLogoutRedirectUri;

  const logout = new Hono<{ Variables: Variables }>();

  // Mounted outside the website group, so `trafficClassLimiter` never sees this
  // route. Every call revokes tokens against Zitadel, so it carries a budget of
  // its own.
  logout.use('*', rateLimiter({ limit: LOGOUT_REQUESTS_PER_MINUTE }));

  logout.get('/', async (c) => {
    const request = c.req.raw;

    // Nothing to revoke: send the visitor straight back to where a completed
    // logout would have landed them anyway.
    if (!c.get('session')) return c.redirect(postLogoutRedirectUri ?? `${appUrl}/`, 302);

    try {
      const { idToken } = await getIdTokenSession(request);
      await AuthService.logout(request.headers.get('Cookie'), idToken);

      // `postLogoutRedirectUri` stays undefined when the env var is unset, so
      // `buildEndSessionUrl` omits client_id and post_logout_redirect_uri and
      // Zitadel falls back to its default logout page instead of answering 400.
      const endSessionUrl = buildEndSessionUrl(idToken, {
        issuer: zitadelIssuer,
        clientId: env.server.authOidcClientId,
        postLogoutRedirectUri,
      });

      // No idToken means no RP-initiated logout; local cookies still go.
      if (!endSessionUrl) return destroyLocalSessions(request);

      const headers = await destroyAllAuthCookies(request);
      headers.set('Location', endSessionUrl);
      return new Response(null, { status: 302, headers });
    } catch (error) {
      console.error('[Auth] Error during website sign out process:', error);
      return destroyLocalSessions(request);
    }
  });

  return logout;
}
