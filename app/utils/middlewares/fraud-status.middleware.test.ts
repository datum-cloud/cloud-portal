import { fraudStatusMiddleware } from './fraud-status.middleware';
import type { MiddlewareContext } from './middleware';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';

// getUserWithAccessRetry is the seam: every indeterminate-state exit is
// reachable by controlling what it returns or throws. getSession controls the
// no-session keeper. Mutable per-test behaviour, following
// legacy-setup.middleware.test.ts.
type Access = { error: 'not_found' | 'forbidden' | 'other' } | { user: Record<string, unknown> };

let access: Access | (() => never) = { error: 'other' };
let session: { sub?: string } | null = { sub: 'u1' };

const getUserWithAccessRetry = mock(async () => {
  if (typeof access === 'function') return access();
  return access;
});

mock.module('@/utils/fraud/user-access', () => ({
  getUserWithAccessRetry,
  appendSetCookieHeaders: () => {},
}));

mock.module('@/utils/cookies', () => ({
  getSession: async () => ({ session }),
}));

mock.module('@/modules/axios/request-context', () => ({
  getRequestContext: () => undefined,
}));

const gateOn = () => {
  process.env.EMAIL_VERIFICATION_GATE = 'true';
};
const gateOff = () => {
  delete process.env.EMAIL_VERIFICATION_GATE;
};

const approvedVerifiedUser = () => ({
  sub: 'u1',
  state: 'Active',
  platformAccess: 'Approved',
  nameReviewRequired: false,
  emailVerified: true,
});

function ctxFor(path: string): MiddlewareContext {
  return { request: new Request(`http://localhost${path}`), context: {} as never };
}

beforeEach(() => {
  access = { error: 'other' };
  session = { sub: 'u1' };
  getUserWithAccessRetry.mockClear();
});

afterEach(() => {
  gateOff();
});

describe('fraudStatusMiddleware — indeterminate-state exits', () => {
  it("gate OFF: an 'other' error still passes through (today's behaviour, byte-identical)", async () => {
    gateOff();
    const next = mock(async () => new Response('ok'));
    const res = await fraudStatusMiddleware(ctxFor('/dashboard'), next);
    expect(next).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("gate ON: an 'other' error redirects to /verifying instead of admitting", async () => {
    gateOn();
    const next = mock(async () => new Response('ok'));
    const res = await fraudStatusMiddleware(ctxFor('/dashboard'), next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/verifying');
  });

  it('gate ON: a thrown error redirects rather than falling through the catch', async () => {
    gateOn();
    access = () => {
      throw new Error('boom');
    };
    const next = mock(async () => new Response('ok'));
    const res = await fraudStatusMiddleware(ctxFor('/dashboard'), next);
    expect(next).not.toHaveBeenCalled();
    expect(res.headers.get('Location')).toBe('/verifying');
  });

  // The keepers. These are the assertions that fail if someone "flips them all".
  it('gate ON: the logout route still passes through — the escape hatch survives', async () => {
    gateOn();
    access = () => {
      throw new Error('boom');
    };
    const next = mock(async () => new Response('ok'));
    await fraudStatusMiddleware(ctxFor('/logout'), next);
    expect(next).toHaveBeenCalled();
  });

  it('gate ON: no session still passes through to authMiddleware', async () => {
    gateOn();
    session = null;
    const next = mock(async () => new Response('ok'));
    await fraudStatusMiddleware(ctxFor('/dashboard'), next);
    expect(next).toHaveBeenCalled();
  });

  it('gate ON: a resolved, permitted user still passes through', async () => {
    gateOn();
    access = { user: approvedVerifiedUser() };
    const next = mock(async () => new Response('ok'));
    await fraudStatusMiddleware(ctxFor('/dashboard'), next);
    expect(next).toHaveBeenCalled();
  });
});
