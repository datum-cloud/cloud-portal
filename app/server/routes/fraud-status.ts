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

  // The refresh is load-bearing for /verify-email rather than an optimisation:
  // verification is an id_token claim, so it only changes when a new token is
  // issued. `?refresh=0` remains for callers that only want a read — they will
  // not observe a verification change while they use it.
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
