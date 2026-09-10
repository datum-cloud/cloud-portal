import { createFraudStatusRoutes } from './fraud-status';
import type { Variables } from '@/server/types';
import type { UserAccessResult } from '@/utils/fraud/user-access';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';

const verifiedUser = {
  sub: 'u1',
  platformAccess: 'Approved',
  state: 'Active',
  emailVerified: true,
};

function appWith(access: UserAccessResult) {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('session', { sub: 'u1' } as Variables['session']);
    await next();
  });
  app.route('/', createFraudStatusRoutes({ loadUser: async () => access }));
  return app;
}

describe('fraud-status', () => {
  // /verify-email polls this endpoint with the proactive refresh ON, so a
  // rotation happens on every tick. Zitadel rotates refresh tokens, which makes
  // dropping the Set-Cookie worse than a stale read: the next tick would present
  // a token the IdP has already invalidated and log the user out mid-verification.
  it('forwards rotated session cookies to the browser', async () => {
    const rotated = new Headers();
    rotated.append('Set-Cookie', '_session=new; Path=/');
    rotated.append('Set-Cookie', '_refresh_token=rotated; Path=/');

    const res = await appWith({
      user: verifiedUser as never,
      refreshedHeaders: rotated,
    }).request('/');

    const cookies = res.headers.getSetCookie();
    expect(cookies).toContain('_session=new; Path=/');
    expect(cookies).toContain('_refresh_token=rotated; Path=/');
  });

  it('sets no cookies when nothing was refreshed', async () => {
    const res = await appWith({ user: verifiedUser as never }).request('/');
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it('reports an unreadable user as fraud-review, not email-unverified', async () => {
    // Holding someone on /verify-email for an upstream failure that has nothing
    // to do with their address is the bug this guards.
    const res = await appWith({ error: 'other' }).request('/');
    expect(await res.json()).toEqual({ status: 'pending', reason: 'fraud-review' });
  });
});
