import { oncePerRequest } from '@/modules/axios/request-context';
import { createOrganizationService } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import {
  type UserAccessResult,
  type getUserWithAccessRetry,
  loadUserOncePerRequest,
} from '@/utils/fraud/user-access';
import { requestCacheKeys } from '@/utils/request-cache-keys';

/**
 * The onboarding layout and the step loaders run concurrently, so they all
 * read the user through the same once-per-request cache. None of them forces
 * a token refresh up front: Zitadel invalidates the old access token on
 * refresh, and a sibling loader still holding it would get a 401. The 401/403
 * retry inside the shared read can still refresh when the token is rejected.
 */
export function loadOnboardingUser(
  userId: string,
  request: Request,
  loadUser?: typeof getUserWithAccessRetry
): Promise<UserAccessResult> {
  return loadUserOncePerRequest(userId, request.headers.get('Cookie'), loadUser);
}

/**
 * Where to send a user whose access check failed: the fraud "verifying" page
 * when the account is missing or blocked (not_found, forbidden), otherwise
 * log out.
 */
export function onboardingAccessRedirect(
  access: Extract<UserAccessResult, { error: unknown }>
): string {
  return access.error === 'not_found' || access.error === 'forbidden'
    ? paths.fraud.verifying
    : paths.auth.logOut;
}

/**
 * True when the user belongs to at least one organization. Uses the same key
 * and call as authMiddleware, so both share one promise per request.
 */
export async function hasAnyOrganizations(): Promise<boolean> {
  const organizations = await oncePerRequest(requestCacheKeys.anyOrganizations, () =>
    createOrganizationService().list({ limit: 1 })
  );
  return organizations.items.length > 0;
}
