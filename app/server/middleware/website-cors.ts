import type { Variables } from '@/server/types';
import { createMiddleware } from 'hono/factory';

/** Custom header every website write must carry. Its presence forces a CORS preflight. */
export const WEBSITE_CSRF_HEADER = 'X-Datum-Website';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export interface WebsiteCorsOptions {
  /** Exact origins, as the browser sends them in `Origin`. */
  origins: string[];
}

/**
 * CORS for the datum.net website routes.
 *
 * The browser attaches cloud-portal's session cookie to same-site requests from
 * www.datum.net, so the only thing standing between "any *.datum.net page" and
 * these routes is this check. Exact-origin match, credentials allowed, and a
 * custom header on writes so a preflight gates every state change.
 */
export function websiteCorsMiddleware({ origins }: WebsiteCorsOptions) {
  const allowed = new Set(origins);

  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const origin = c.req.header('Origin');
    if (!origin || !allowed.has(origin)) {
      c.header('Vary', 'Origin', { append: true });
      c.header('Cache-Control', 'no-store');
      return c.json({ error: 'origin_not_allowed' }, 403);
    }

    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Vary', 'Origin', { append: true });
    c.header('Cache-Control', 'no-store');

    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      c.header('Access-Control-Allow-Headers', `Content-Type, ${WEBSITE_CSRF_HEADER}`);
      c.header('Access-Control-Max-Age', '600');
      return c.body(null, 204);
    }

    if (WRITE_METHODS.has(c.req.method) && c.req.header(WEBSITE_CSRF_HEADER) !== '1') {
      return c.json({ error: 'missing_website_header' }, 403);
    }

    await next();
  });
}
