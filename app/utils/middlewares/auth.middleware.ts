import { MiddlewareContext, NextFunction } from './middleware';
import { getRequestContext } from '@/modules/axios/request-context';
import { createOrganizationService } from '@/resources/organizations';
import { createUserService, type User } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { getSession, isAuthenticated } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { redirect } from 'react-router';

/**
 * Authentication middleware that checks if a user is authenticated
 * and either proceeds to the next middleware or redirects to login.
 *
 * After auth, users with no organizations are sent into onboarding:
 * profile when `nameReviewRequired`, otherwise billing.
 *
 * Uses session from load context when available (already validated by Hono
 * sessionMiddleware) to avoid redundant getSession calls and reduce redirect latency.
 */
export async function authMiddleware(
  ctx: MiddlewareContext,
  next: NextFunction
): Promise<Response> {
  const { request, context } = ctx;

  // Session already validated by Hono sessionMiddleware - skip redundant getSession
  // Verify session has an actual identity (sub), not just a truthy object
  if (context?.session?.sub) {
    const onboardingRedirect = await redirectToOnboardingIfNoOrgs(ctx, context.session.sub);
    if (onboardingRedirect) {
      return onboardingRedirect;
    }
    return next();
  }

  const result = await isAuthenticated(request);

  // If result is a Response object (redirect), return it directly
  if (result instanceof Response) {
    return result;
  }

  // If result is true (user is authenticated), proceed to next middleware
  if (result === true) {
    const { session } = await getSession(request);
    if (session?.sub) {
      const onboardingRedirect = await redirectToOnboardingIfNoOrgs(ctx, session.sub);
      if (onboardingRedirect) {
        return onboardingRedirect;
      }
    }
    return next();
  }

  // This should not happen if isAuthenticated is properly implemented,
  // but added as a fallback for type safety
  throw new AuthenticationError('User is not authenticated');
}

/** First onboarding step for users who have not joined an org yet. */
export const onboardingEntryPath = (user: User): string =>
  user.nameReviewRequired ? paths.onboarding.profile : paths.onboarding.account;

const isOnboardingPath = (pathname: string): boolean =>
  pathname === paths.onboarding.root || pathname.startsWith(`${paths.onboarding.root}/`);

/** Routes that should not trigger the no-orgs onboarding redirect. */
const shouldSkipOnboardingRedirect = (pathname: string): boolean => {
  if (pathname === paths.auth.logOut) return true;
  if (pathname.startsWith(`${paths.auth.root}/`) || pathname === paths.auth.root) return true;
  if (isOnboardingPath(pathname)) return true;
  if (pathname === paths.fraud.verifying) return true;
  if (pathname === paths.fraud.accountUnderReview) return true;
  if (pathname === paths.fraud.accountSuspended) return true;
  if (/^\/invitation\/[^/]+\/accept$/.test(pathname)) return true;
  return false;
};

async function redirectToOnboardingIfNoOrgs(
  ctx: MiddlewareContext,
  userId: string
): Promise<Response | null> {
  const pathname = new URL(ctx.request.url).pathname;
  if (shouldSkipOnboardingRedirect(pathname)) {
    return null;
  }

  try {
    const user = await createUserService().get(userId);

    const reqCtx = getRequestContext();
    if (reqCtx) {
      reqCtx.cachedUser = user;
    }

    const organizations = await createOrganizationService().list({ limit: 1 });
    if (organizations.items.length > 0) {
      return null;
    }

    return redirect(onboardingEntryPath(user));
  } catch {
    // Fail-open — fraudStatusMiddleware handles user provisioning edge cases.
    return null;
  }
}
