import type { Variables } from '@/server/types';
import { isEmailVerificationGateEnabled } from '@/utils/config/email-verification-gate';
import { getUserWithAccessRetry } from '@/utils/fraud/user-access';
import { createMiddleware } from 'hono/factory';

/**
 * Blocks unverified accounts from API endpoints that spend Datum's own
 * third-party credentials.
 *
 * The page-level gate lives in the React Router private layout, so it covers
 * navigation and route actions but not this Hono API surface. Most routes here
 * forward the caller's own access token (`/graphql`, `/proxy`, `/watch`,
 * `/permissions`, `/user`, `/grafana`, `/prometheus`), which makes the upstream
 * API the enforcement point — re-deriving the same answer here would cost a
 * round trip per request to duplicate a check that already happens.
 *
 * The exceptions are the routes that authenticate with a key the portal holds
 * (`/assistant` → Anthropic, `/cloudvalid` → CloudValid, `/usage` → Amberflo).
 * Nothing downstream knows or cares who the caller is, so an unverified signup
 * can spend real money through them. Those are the routes this guard covers.
 *
 * Fail-CLOSED on an unreadable user, matching every other decision point in the
 * gate: an upstream outage must not become a way past it.
 *
 * Costs nothing while the flag is off — the shipping default — because that
 * check runs before the user is fetched.
 *
 * `loadUser` is injectable so tests can drive every branch without
 * `mock.module`, which is process-global in bun and would leak this module's
 * stub into any suite that runs afterwards.
 */
export function emailVerifiedGuardMiddleware(
  options: { loadUser?: typeof getUserWithAccessRetry } = {}
) {
  const loadUser = options.loadUser ?? getUserWithAccessRetry;

  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    if (!isEmailVerificationGateEnabled()) {
      return next();
    }

    const session = c.get('session');
    if (!session?.sub) {
      // authGuardMiddleware owns the unauthenticated case and runs first.
      return next();
    }

    const access = await loadUser(session.sub, c.req.header('Cookie') ?? null);
    const isVerified = 'error' in access ? false : access.user.emailVerified === true;

    if (!isVerified) {
      return c.json(
        {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Verify your email address to use this endpoint.',
          status: 403,
        },
        403
      );
    }

    return next();
  });
}
