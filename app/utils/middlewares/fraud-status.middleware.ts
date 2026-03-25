import { type MiddlewareContext, type NextFunction } from './middleware';
import { getRequestContext } from '@/modules/axios/request-context';
import { createUserService } from '@/resources/users';
import { RegistrationApproval } from '@/resources/users/user.schema';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { redirect } from 'react-router';

/**
 * Fraud status middleware that gates access based on user.status fields set by
 * the fraud operator via Milo IAM resources (UserDeactivation, PlatformAccessApproval,
 * PlatformAccessRejection).
 *
 * Algorithm:
 * 1. Read session; if no sub, call next() (let authMiddleware handle)
 * 2. Fetch user; if NotFoundError or AuthorizationError → /verifying (not yet provisioned or permissions not yet propagated); other errors → fail-open
 * 3. Cache user in reqCtx to avoid a second upstream call in the layout loader
 * 4. state === 'Inactive'                  → /account-suspended
 * 5. registrationApproval === 'Approved'   → if nameReviewRequired and not on onboarding complete-profile → redirect there; else next()
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

    let user;
    try {
      user = await createUserService().get(session.sub);
    } catch (userError) {
      if (userError instanceof NotFoundError) {
        return redirect(paths.fraud.verifying);
      }
      // 403 means the user exists in Milo but OpenFGA permissions haven't
      // propagated yet (race condition on new signups). Send to /verifying
      // so the polling loop waits for propagation before proceeding.
      if (userError instanceof AuthorizationError) {
        return redirect(paths.fraud.verifying);
      }
      // Fail-open on other errors (e.g. upstream unavailable)
      return next();
    }

    if (!user) {
      return next();
    }

    const reqCtx = getRequestContext();
    if (reqCtx) {
      reqCtx.cachedUser = user;
    }

    // Deactivated accounts take priority over registrationApproval
    if (user.state === 'Inactive') {
      return redirect(paths.fraud.accountSuspended);
    }

    if (user.registrationApproval === RegistrationApproval.Approved) {
      const pathname = new URL(request.url).pathname;
      if (user.nameReviewRequired && pathname !== paths.onboarding.completeProfile) {
        return redirect(paths.onboarding.completeProfile);
      }
      return next();
    }

    if (user.registrationApproval === RegistrationApproval.Rejected) {
      return redirect(paths.fraud.accountUnderReview);
    }

    // Pending or undefined — evaluation still in progress
    return redirect(paths.fraud.verifying);
  } catch {
    // Fail-open on unexpected errors
    return next();
  }
}
