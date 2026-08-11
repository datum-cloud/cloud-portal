import type { Variables } from '../types';
import { getUserWithAccessRetry } from '@/utils/fraud/user-access';
import { resolveFraudPollResult } from '@/utils/middlewares/fraud-redirect';
import { Hono } from 'hono';

const fraudStatus = new Hono<{ Variables: Variables }>();

/**
 * GET /api/fraud-status
 *
 * Lightweight polling endpoint used by the /verifying page to check whether
 * the fraud evaluation has completed and what decision was made.
 */
fraudStatus.get('/', async (c) => {
  const session = c.get('session')!;
  const cookieHeader = c.req.header('Cookie') ?? null;

  // The proactive token refresh exists for /verifying, which polls for seconds
  // immediately after signup while OpenFGA tuples propagate. /verify-email can
  // poll for as long as it takes someone to open an email, where a refresh per
  // tick is pure cost — a refresh_token grant and a session-cookie rotation
  // every few seconds, for minutes. Long-lived callers pass `?refresh=0`; a 403
  // mid-poll still triggers the reactive refresh inside getUserWithAccessRetry.
  const refreshBeforeRead = c.req.query('refresh') !== '0';
  const access = await getUserWithAccessRetry(session.sub!, cookieHeader, { refreshBeforeRead });

  if ('error' in access) {
    // Unreadable user (404/403 during propagation, or an upstream failure).
    // Deliberately NOT 'email-unverified': /verify-email would hold them here
    // indefinitely on an error that has nothing to do with their address. As
    // 'fraud-review' the page hands control back to the server, and
    // fraudStatusMiddleware routes them to /verifying — which is what an
    // unreadable user got before the email gate existed.
    return c.json({ status: 'pending' as const, reason: 'fraud-review' as const });
  }

  const { user, refreshedHeaders } = access;
  refreshedHeaders?.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      c.header('Set-Cookie', value, { append: true });
    }
  });

  return c.json(resolveFraudPollResult(user));
});

export { fraudStatus as fraudStatusRoutes };
