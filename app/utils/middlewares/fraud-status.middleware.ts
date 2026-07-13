import { resolveUserFraudRedirectPath } from './fraud-redirect';
import { type MiddlewareContext, type NextFunction } from './middleware';
import { getRequestContext } from '@/modules/axios/request-context';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { appendSetCookieHeaders, getUserWithAccessRetry } from '@/utils/fraud/user-access';
import { redirect } from 'react-router';

/**
 * Fraud status middleware that gates access based on user.status fields set by
 * the fraud operator via Milo IAM resources (UserDeactivation, PlatformAccessApproval,
 * PlatformAccessRejection).
 *
 * Algorithm:
 * 1. Read session; if no sub, call next() (let authMiddleware handle)
 * 2. Fetch user (or reuse auth middleware cache); if NotFoundError or AuthorizationError → /verifying (not yet provisioned or permissions not yet propagated); other errors → fail-open
 * 3. Cache user in reqCtx to avoid a second upstream call in the layout loader
 * 4. state === 'Inactive'                  → /account-suspended
 * 5. registrationApproval === 'Approved'   → if nameReviewRequired and not on onboarding profile → redirect there; else next()
 * 6. registrationApproval === 'Rejected'   → /account-under-review
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
        return next();
      }

      user = access.user;
      refreshedHeaders = access.refreshedHeaders;
    }

    if (!user) {
      return next();
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
    // Fail-open on unexpected errors
    return next();
  }
}
