import type { Variables } from '@/server/types';
import { createMiddleware } from 'hono/factory';

const HTTP_PREFIX = 'http://';

/**
 * Restores the public `https://` scheme on requests that arrive through the
 * TLS-terminating gateway (Envoy in staging/production).
 *
 * The gateway forwards plain HTTP, so Bun builds `request.url` as
 * `http://<host>/...` while the browser sends `Origin: https://<host>`.
 * react-router >= 8.3.1 compares the two INCLUDING the scheme before running
 * any action, so every action POST fails with a 400 unless the scheme is
 * corrected here.
 *
 * Because react-router-hono-server invokes the React Router handler with
 * `c.req.raw`, swapping that Request is enough for everything downstream
 * (session cookies, redirects, loaders/actions) to see the real URL. Method,
 * headers, body and abort signal carry over to the rebuilt Request.
 *
 * Only the exact value `https` is honoured; a missing header (local dev, E2E)
 * or any other value leaves the request untouched. `X-Forwarded-Host` is
 * deliberately ignored: the HTTPRoute in config/base/http-route.yaml has no
 * hostname rewrite, so `Host` already carries the public hostname and only
 * the scheme is lost at the gateway.
 */
export function forwardedProtoMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const raw = c.req.raw;

    if (c.req.header('X-Forwarded-Proto') === 'https' && raw.url.startsWith(HTTP_PREFIX)) {
      c.req.raw = new Request(`https://${raw.url.slice(HTTP_PREFIX.length)}`, raw);
    }

    await next();
  });
}
