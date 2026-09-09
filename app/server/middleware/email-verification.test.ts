import { emailVerifiedGuardMiddleware } from './email-verification';
import type { Variables } from '@/server/types';
import type { UserAccessResult } from '@/utils/fraud/user-access';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';

// The user loader is the seam — injected rather than mock.module'd, which is
// process-global in bun and would leak this stub into user-access.test.ts.
let access: UserAccessResult = { user: { sub: 'u1', emailVerified: true } as never };

const loadUser = async (): Promise<UserAccessResult> => access;

const gateOn = () => {
  process.env.EMAIL_VERIFICATION_GATE = 'true';
};
const gateOff = () => {
  delete process.env.EMAIL_VERIFICATION_GATE;
};

/** Mirrors createApiApp: a session is already in context by the time this runs. */
function appWithSession(session: { sub?: string } | null = { sub: 'u1' }) {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    if (session) c.set('session', session as Variables['session']);
    await next();
  });
  app.use('/assistant/*', emailVerifiedGuardMiddleware({ loadUser }));
  app.post('/assistant', (c) => c.json({ reached: true }));
  return app;
}

beforeEach(() => {
  access = { user: { sub: 'u1', emailVerified: true } as never };
});

afterEach(() => {
  gateOff();
});

describe('emailVerifiedGuardMiddleware', () => {
  it('is inert while the flag is off — the shipping default', async () => {
    gateOff();
    access = { user: { sub: 'u1', emailVerified: false } as never };

    const res = await appWithSession().request('/assistant', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reached: true });
  });

  it('lets a verified user through when the flag is on', async () => {
    gateOn();

    const res = await appWithSession().request('/assistant', { method: 'POST' });

    expect(res.status).toBe(200);
  });

  it('blocks an unverified user with the flag on', async () => {
    gateOn();
    access = { user: { sub: 'u1', emailVerified: false } as never };

    const res = await appWithSession().request('/assistant', { method: 'POST' });

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('reads an ABSENT emailVerified as unverified (fail-closed)', async () => {
    gateOn();
    access = { user: { sub: 'u1' } as never };

    const res = await appWithSession().request('/assistant', { method: 'POST' });

    expect(res.status).toBe(403);
  });

  it('fails CLOSED when the user cannot be read', async () => {
    // An upstream outage must not become a way past the gate — the same
    // reading every other decision point in the cascade takes.
    gateOn();
    for (const error of ['not_found', 'forbidden', 'other'] as const) {
      access = { error };
      const res = await appWithSession().request('/assistant', { method: 'POST' });
      expect(res.status).toBe(403);
    }
  });

  it('defers the unauthenticated case to authGuardMiddleware', async () => {
    // authGuard runs first in createApiApp and owns the 401. Returning 403
    // here would mask it behind a misleading reason.
    gateOn();

    const res = await appWithSession(null).request('/assistant', { method: 'POST' });

    expect(res.status).toBe(200);
  });
});
