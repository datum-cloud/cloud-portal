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
  const access = await getUserWithAccessRetry(session.sub!, cookieHeader, {
    refreshBeforeRead: true,
  });

  if ('error' in access) {
    return c.json({ status: 'pending' as const });
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
