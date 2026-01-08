import { withRequestContext } from '@/modules/axios/request-context';
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

    // Wrap entire request - token & requestId auto-injected to axios calls
    return withRequestContext(
      {
        requestId,
        token: session?.accessToken ?? '',
        userId: session?.sub ?? '',
      },
      () => next()
    );
  });
}
