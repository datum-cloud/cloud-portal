import { type RequestContext, withRequestContext } from '@/modules/axios/request-context';
import type { Variables } from '@/server/types';
import { createMiddleware } from 'hono/factory';

/**
 * Sets up AsyncLocalStorage context for the entire request lifecycle.
 * Makes token & requestId available to all axios calls without prop drilling.
 * Must run AFTER sessionMiddleware.
 */
export function requestContextMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const requestId = c.get('requestId');
    const session = c.get('session');

    const ctx: RequestContext = {
      requestId,
      token: session?.accessToken ?? '',
      userId: session?.sub ?? '',
      userAgent: c.req.header('User-Agent') || undefined,
      cookieHeader: c.req.header('Cookie') ?? null,
    };

    // Wrap entire request - token & requestId auto-injected to axios calls
    return withRequestContext(ctx, async () => {
      await next();

      // An upstream call redeemed a rotated session: the browser's refresh
      // token is spent, so it must receive the new one or its next request
      // fails. Appended last so these win over any cookie the loader set. A
      // fresh Response because a redirect's headers are immutable.
      const rotated = ctx.rotatedCookies?.getSetCookie() ?? [];
      if (rotated.length === 0) return;

      c.res = new Response(c.res.body, c.res);
      for (const cookie of rotated) {
        c.res.headers.append('Set-Cookie', cookie);
      }
    });
  });
}
