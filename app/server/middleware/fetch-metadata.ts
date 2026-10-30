import { logger } from '@/modules/logger';
import type { Variables } from '@/server/types';
import { AuthorizationError } from '@/utils/errors/app-error';
import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * `same-origin` is every fetch the portal makes; `none` is a user-initiated
 * navigation (address bar, bookmark). `same-site` is refused: no other
 * datum.net host calls /api, and the datum.net website has its own CORS-gated
 * group under /api/website, mounted outside this sub-app.
 */
const ALLOWED_FETCH_SITES = new Set(['same-origin', 'none']);

/**
 * True when a browser says the request came from another site. Browsers
 * without fetch metadata still send Origin on state-changing requests, so
 * that is compared with Host instead. A request with neither header did not
 * come from a page at all (curl, a server), which is not a CSRF vector.
 */
export function isCrossSiteRequest(c: Context): boolean {
  const site = c.req.header('Sec-Fetch-Site');
  if (site) return !ALLOWED_FETCH_SITES.has(site);

  const origin = c.req.header('Origin');
  if (!origin) return false;
  const host = c.req.header('Host');
  try {
    return !host || new URL(origin).host !== host;
  } catch {
    // `Origin: null` (sandboxed frames, opaque redirects) and anything unparsable.
    return true;
  }
}

/**
 * Rejects cross-site POST/PUT/PATCH/DELETE with 403. Session cookies are
 * SameSite=Lax, which a same-site page or an older browser can get around;
 * this makes the browser's own account of where the request came from the
 * second check. Reads are untouched.
 */
export function fetchMetadataGuard() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    if (STATE_CHANGING_METHODS.has(c.req.method) && isCrossSiteRequest(c)) {
      logger.warn('[fetch-metadata] cross-site request rejected', {
        requestId: c.get('requestId'),
        method: c.req.method,
        path: c.req.path,
        secFetchSite: c.req.header('Sec-Fetch-Site'),
        origin: c.req.header('Origin'),
      });
      throw new AuthorizationError('Cross-site request rejected', c.get('requestId'));
    }
    await next();
  });
}
