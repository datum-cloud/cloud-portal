import type { Variables } from '@/server/types';
import { AuthService } from '@/utils/auth/auth.service';
import { AuthenticationError } from '@/utils/errors/app-error';
import * as Sentry from '@sentry/react-router';
import { createMiddleware } from 'hono/factory';

export function authMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const requestId = c.get('requestId');
    const cookieHeader = c.req.header('Cookie') ?? null;

    const { session, headers, refreshed } = await AuthService.getValidSession(cookieHeader);

    if (!session) {
      throw new AuthenticationError('Authentication required', requestId);
    }

    c.set('session', session);

    if (refreshed) {
      headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          c.header('Set-Cookie', value, { append: true });
        }
      });
    }

    Sentry.setUser({ id: session.sub });

    await next();
  });
}

export function optionalAuthMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const cookieHeader = c.req.header('Cookie') ?? null;

    const { session, headers, refreshed } = await AuthService.getValidSession(cookieHeader);

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
    }

    await next();
  });
}
