import {
  denyIfEmailGateEnabled,
  onboardingEntryPath,
  resolveUserFraudRedirectPath,
} from './fraud-redirect';
import { MiddlewareContext, NextFunction } from './middleware';
import { getRequestContext, oncePerRequest } from '@/modules/axios/request-context';
import { createOrganizationService } from '@/resources/organizations';
import { sessionContext } from '@/server/context';
import { paths } from '@/utils/config/paths.config';
import { getSession, isAuthenticated } from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import {
  appendSetCookieHeaders,
  getUserWithAccessRetry,
  loadUserOncePerRequest,
} from '@/utils/fraud/user-access';
import { requestCacheKeys } from '@/utils/request-cache-keys';
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
/** Injectable upstream reads — see the `deps` note on {@link authMiddleware}. */
export interface AuthMiddlewareDeps {
  loadUser?: typeof getUserWithAccessRetry;
  listOrganizations?: () => Promise<{ items: unknown[] }>;
}

export async function authMiddleware(
  ctx: MiddlewareContext,
  next: NextFunction,
  // Optional seam, mirroring fraudStatusMiddleware: the upstream reads are
  // injected rather than mock.module'd, which is process-global in bun and
  // would leak these stubs into every later suite.
  deps: AuthMiddlewareDeps = {}
): Promise<Response> {
  const { request, context } = ctx;

  // Session already validated by Hono sessionMiddleware - skip redundant getSession
  // Verify session has an actual identity (sub), not just a truthy object
  const contextSession = context?.get(sessionContext);
  if (contextSession?.sub) {
    const onboardingRedirect = await redirectToOnboardingIfNoOrgs(ctx, contextSession.sub, deps);
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
      const onboardingRedirect = await redirectToOnboardingIfNoOrgs(ctx, session.sub, deps);
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

export { onboardingEntryPath };

const isOnboardingPath = (pathname: string): boolean =>
  pathname === paths.onboarding.root || pathname.startsWith(`${paths.onboarding.root}/`);

// Settings paths the user should always be able to reach, even before they
// have an organisation (e.g. to change their name, delete their account, or
// manage sessions). Derived from the paths config so additions there are
// automatically included here.
const ACCOUNT_SETTINGS_PATHS = new Set(Object.values(paths.account.settings));

/** Routes that should not trigger the no-orgs onboarding redirect. */
const shouldSkipOnboardingRedirect = (pathname: string): boolean => {
  if (pathname === paths.auth.logOut) return true;
  if (pathname.startsWith(`${paths.auth.root}/`) || pathname === paths.auth.root) return true;
  if (isOnboardingPath(pathname)) return true;
  if (pathname === paths.fraud.verifying) return true;
  if (pathname === paths.fraud.accountUnderReview) return true;
  if (pathname === paths.fraud.accountSuspended) return true;
  if (pathname === paths.fraud.verifyEmail) return true;
  if (/^\/invitation\/[^/]+\/accept$/.test(pathname)) return true;
  // Account settings are user-level and org-independent — always reachable.
  if (ACCOUNT_SETTINGS_PATHS.has(pathname)) return true;
  return false;
};

async function redirectToOnboardingIfNoOrgs(
  ctx: MiddlewareContext,
  userId: string,
  deps: AuthMiddlewareDeps = {}
): Promise<Response | null> {
  const loadUser = deps.loadUser ?? getUserWithAccessRetry;
  const listOrganizations =
    deps.listOrganizations ?? (() => createOrganizationService().list({ limit: 1 }));
  const pathname = new URL(ctx.request.url).pathname;
  if (shouldSkipOnboardingRedirect(pathname)) {
    return null;
  }

  const cookieHeader = ctx.request.headers.get('Cookie');
  // Single-flighted, not merely cached afterwards: route loaders run
  // concurrently with this middleware, so a value written after the await
  // arrives too late for the loader that needed it. An indeterminate result is
  // not shared onward — see `loadUserOncePerRequest`.
  const access = await loadUserOncePerRequest(userId, cookieHeader, loadUser);

  if ('error' in access) {
    // Defence in depth, and not load-bearing today: private.layout.tsx runs
    // authMiddleware BEFORE fraudStatusMiddleware, so returning null here falls
    // through to a middleware that fetches and decides for itself. Nothing
    // enforces that ordering, though, so the indeterminate case is answered
    // here too — via the same helper, so the two cannot drift apart.
    return denyIfEmailGateEnabled() ?? null;
  }

  const { user, refreshedHeaders } = access;

  const reqCtx = getRequestContext();
  if (reqCtx) {
    reqCtx.cachedUser = user;
  }

  try {
    const organizations = await oncePerRequest(
      requestCacheKeys.anyOrganizations,
      listOrganizations
    );
    const hasOrganizations = organizations.items.length > 0;
    // Cached for readers that run after this point; the `oncePerRequest` key
    // above is what covers the concurrent ones.
    if (reqCtx) {
      reqCtx.hasOrganizations = hasOrganizations;
    }
    if (hasOrganizations) {
      return null;
    }

    const fraudRedirect = resolveUserFraudRedirectPath(user, pathname);
    if (fraudRedirect) {
      const headers = new Headers();
      appendSetCookieHeaders(headers, refreshedHeaders);
      return redirect(fraudRedirect, { headers });
    }

    const headers = new Headers();
    appendSetCookieHeaders(headers, refreshedHeaders);
    return redirect(onboardingEntryPath(user), { headers });
  } catch {
    // Same reasoning as the 'error' branch above: an org-list or resolver
    // throw means the state is indeterminate.
    return denyIfEmailGateEnabled() ?? null;
  }
}
