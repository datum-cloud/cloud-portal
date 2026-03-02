import type { Variables } from '@/server/types';
import { sessionManager } from '@/utils/auth';
import { AuthenticationError } from '@/utils/errors/app-error';
import * as Sentry from '@sentry/react-router';
import { createMiddleware } from 'hono/factory';

/**
 * Global session middleware - runs for ALL requests.
 * Sets session in context if valid, handles cookie refresh.
 * Does NOT throw if unauthenticated (use authGuardMiddleware for that).
 */
export function sessionMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const cookieHeader = c.req.header('Cookie') ?? null;

    const { session, headers, refreshed } = await sessionManager.getValidSession(cookieHeader);

    if (session) {
      c.set('session', session);

      if (refreshed) {
        headers.forEach((value, key) => {
          if (key.toLowerCase() === 'set-cookie') {
            c.header('Set-Cookie', value, { append: true });
          }
        });
      }

      Sentry.setUser({ id: session.sub });
    } else {
      // Reset Sentry user to prevent scope leaking from a previous request
      // on the same server instance into this unauthenticated request.
      Sentry.setUser(null);
    }

    await next();
  });
}

/**
 * Protected route middleware - requires authentication.
 * Must run AFTER sessionMiddleware (which sets the session).
 * Throws 401 if no session in context.
 */
export function authGuardMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const session = c.get('session');

    if (!session) {
      const requestId = c.get('requestId');
      throw new AuthenticationError('Authentication required', requestId);
    }

    await next();
  });
}
