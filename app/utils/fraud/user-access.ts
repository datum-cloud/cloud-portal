import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import { getRequestContext } from '@/modules/axios/request-context';
import { createUserService } from '@/resources/users';
import type { User } from '@/resources/users';
import { AuthService } from '@/utils/auth';
import { AuthorizationError, NotFoundError } from '@/utils/errors';

export type UserAccessResult =
  { user: User; refreshedHeaders?: Headers } | { error: 'not_found' | 'forbidden' | 'other' };

/**
 * A service-account principal (e.g. the plugin e2e suite's dev token
 * exchange) has no `users.iam.miloapis.com` resource at all — the fetch
 * 403/404s permanently, unlike a freshly-signed-up human where it's a
 * propagation delay. Stand in a minimal, already-approved User so every
 * caller downstream of this function (fraud gates, the private layout's own
 * user lookup) treats the session like any other authenticated account.
 */
function buildDevStubUser(userId: string): User {
  return {
    sub: userId,
    platformAccess: 'Approved',
    state: 'Active',
    nameReviewRequired: false,
    // Fourth gate, same reason as the three above: this principal has no User
    // record at all, so there is nothing for zitadel-provider to have marked
    // verified. Without this the email gate redirects the dev token-exchange
    // session to /verify-email and the plugin e2e suite stops at the door.
    emailVerified: true,
  };
}

/**
 * The collaborators this module reaches out of process for.
 *
 * Injectable because `mock.module` is process-global in bun and cannot reach
 * here reliably. Any suite that imports a fraud middleware loads this module
 * first, binding it to the real modules. A later suite's `mock.module` then
 * rebuilds only its own copy, so the stubs sit on an object this code never
 * calls and the real collaborators run against fake fixtures instead.
 */
export type UserAccessDeps = {
  auth: Pick<typeof AuthService, 'getRefreshToken' | 'getSession' | 'refreshTokens'>;
  getUser: (userId: string) => Promise<User>;
};

const realDeps: UserAccessDeps = {
  auth: AuthService,
  // Built per call: the service reads the request-scoped token, which
  // retryAfterTokenRefresh rewrites before asking for the user again.
  getUser: (userId) => createUserService().get(userId),
};

/**
 * Load the signed-in user for fraud/onboarding gates. On 403 (common right
 * after signup while OpenFGA tuples propagate), force-refresh the OAuth token
 * once and retry so the browser can receive updated session cookies.
 */
export async function getUserWithAccessRetry(
  userId: string,
  cookieHeader: string | null,
  options?: { refreshBeforeRead?: boolean; deps?: Partial<UserAccessDeps> }
): Promise<UserAccessResult> {
  const deps: UserAccessDeps = { ...realDeps, ...options?.deps };

  if (options?.refreshBeforeRead) {
    const refreshed = await retryAfterTokenRefresh(userId, cookieHeader, deps);
    if (refreshed) {
      return refreshed;
    }
  }

  try {
    const user = await deps.getUser(userId);
    return { user: await withSessionEmailVerified(user, cookieHeader, deps) };
  } catch (error) {
    if (error instanceof NotFoundError) {
      if (isOnboardingDevBypassEnabled()) {
        return { user: buildDevStubUser(userId) };
      }
      return { error: 'not_found' };
    }

    if (error instanceof AuthorizationError) {
      const retried = await retryAfterTokenRefresh(userId, cookieHeader, deps);
      if (retried) {
        return retried;
      }
      if (isOnboardingDevBypassEnabled()) {
        return { user: buildDevStubUser(userId) };
      }
      return { error: 'forbidden' };
    }

    return { error: 'other' };
  }
}

async function retryAfterTokenRefresh(
  userId: string,
  cookieHeader: string | null,
  deps: UserAccessDeps
): Promise<{ user: User; refreshedHeaders: Headers } | null> {
  const { refreshToken, rawSession: refreshRaw } = await deps.auth.getRefreshToken(cookieHeader);
  const { rawSession: sessionRaw } = await deps.auth.getSession(cookieHeader);

  if (!refreshToken) {
    return null;
  }

  try {
    const { session: newSession, headers } = await deps.auth.refreshTokens(
      refreshToken,
      sessionRaw,
      refreshRaw
    );

    const reqCtx = getRequestContext();
    if (reqCtx) {
      reqCtx.token = newSession.accessToken;
    }

    const user = await deps.getUser(userId);
    return {
      user: { ...user, emailVerified: newSession.emailVerified },
      refreshedHeaders: headers,
    };
  } catch {
    return null;
  }
}

/**
 * Verification lives on the id_token, not on the milo User, so it has to be
 * overlaid after the fetch. Reading the session rather than the resource is
 * what makes a stale claim possible — callers waiting on verification must
 * force a refresh (`refreshBeforeRead`) rather than poll this alone.
 */
async function withSessionEmailVerified(
  user: User,
  cookieHeader: string | null,
  deps: UserAccessDeps
): Promise<User> {
  const { session } = await deps.auth.getSession(cookieHeader);
  return { ...user, emailVerified: session?.emailVerified === true };
}

export function appendSetCookieHeaders(target: Headers, source?: Headers): void {
  if (!source) return;

  source.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      target.append('Set-Cookie', value);
    }
  });
}
