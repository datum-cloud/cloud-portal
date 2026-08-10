import { resolveUserFraudRedirectPath } from './fraud-redirect';
import { type MiddlewareContext, type NextFunction } from './middleware';
import { getRequestContext } from '@/modules/axios/request-context';
import { isEmailVerificationGateEnabled } from '@/utils/config/email-verification-gate';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { appendSetCookieHeaders, getUserWithAccessRetry } from '@/utils/fraud/user-access';
import { redirect } from 'react-router';

/**
 * E-FC (W0-3). Three of this middleware's six `next()` exits are reached when
 * the user's state could not be DETERMINED — not when it was determined to be
 * fine. Admitting on "we don't know" is a fail-open, and it fails open on
 * exactly the population the Phase B gate exists to catch.
 *
 * Keyed on the gate flag on purpose: with the gate off this returns undefined
 * and every caller behaves byte-identically to pre-Phase-B. Flipping it
 * unconditionally would turn a milo blip into a portal-wide outage before the
 * gate is even on (spec risk #2).
 *
 * /verifying is safe as a destination: routes.ts places it OUTSIDE the
 * private layout, which is this middleware's only registration
 * (private.layout.tsx:96-97), so it cannot loop. It also self-heals — the page
 * polls and releases the user once milo answers again.
 */
const denyIfGated = (): Response | undefined =>
  isEmailVerificationGateEnabled() ? redirect(paths.fraud.verifying) : undefined;

/**
 * Fraud status middleware that gates access based on user.status fields set by
 * the fraud operator via Milo IAM resources (UserDeactivation, PlatformAccessApproval,
 * PlatformAccessRejection).
 *
 * Algorithm:
 * 1. Read session; if no sub, call next() (let authMiddleware handle)
 * 2. Fetch user (or reuse auth middleware cache); if NotFoundError or AuthorizationError → /verifying (not yet provisioned or permissions not yet propagated); other errors → fail-open with the email gate off, /verifying with it on (E-FC)
 * 3. Cache user in reqCtx to avoid a second upstream call in the layout loader
 * 4. state === 'Inactive' || platformAccess === 'Suspended' → /account-suspended
 * 5. platformAccess === 'Approved'         → if nameReviewRequired and not on onboarding profile → redirect there; else next()
 * 6. platformAccess === 'Rejected'         → /account-under-review
 * 7. Pending or undefined                  → /verifying
 */
export async function fraudStatusMiddleware(
  ctx: MiddlewareContext,
  next: NextFunction
): Promise<Response> {
  const { request } = ctx;

  // Short-circuit for the logout route so users can always sign out.
  if (new URL(request.url).pathname === paths.auth.logOut) {
    return next();
  }

  try {
    const { session } = await getSession(request);

    if (!session?.sub) {
      return next();
    }

    let user = getRequestContext()?.cachedUser;
    let refreshedHeaders: Headers | undefined;

    if (!user) {
      const access = await getUserWithAccessRetry(session.sub, request.headers.get('Cookie'));

      if ('error' in access) {
        if (access.error === 'not_found' || access.error === 'forbidden') {
          return redirect(paths.fraud.verifying);
        }
        // 'other' = milo 5xx, timeout, reset, decode error — the state could
        // not be determined. The widest W0-3 fail-open, and the one that fires
        // in a real incident.
        return denyIfGated() ?? next();
      }

      user = access.user;
      refreshedHeaders = access.refreshedHeaders;
    }

    if (!user) {
      // Unreachable on current types; the guard exists because its author did
      // not trust that, and an unknown user must not pass a security gate.
      return denyIfGated() ?? next();
    }

    const reqCtx = getRequestContext();
    if (reqCtx) {
      reqCtx.cachedUser = user;
    }

    const pathname = new URL(request.url).pathname;
    const fraudRedirect = resolveUserFraudRedirectPath(user, pathname);
    if (fraudRedirect) {
      const headers = new Headers();
      appendSetCookieHeaders(headers, refreshedHeaders);
      return redirect(fraudRedirect, { headers });
    }

    return next();
  } catch {
    // Unexpected throw (getSession, the resolver, header handling): fail-open
    // with the email gate off — byte-identical to pre-Phase-B — and /verifying
    // with it on (E-FC). The logout short-circuit above runs before this try,
    // so the escape hatch survives either way.
    return denyIfGated() ?? next();
  }
}
