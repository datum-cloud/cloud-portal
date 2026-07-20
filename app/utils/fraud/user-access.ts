import { getRequestContext } from '@/modules/axios/request-context';
import { createUserService } from '@/resources/users';
import type { User } from '@/resources/users';
import { AuthService } from '@/utils/auth';
import { AuthorizationError, NotFoundError } from '@/utils/errors';

export type UserAccessResult =
  | { user: User; refreshedHeaders?: Headers }
  | { error: 'not_found' | 'forbidden' | 'other' };

/**
 * Load the signed-in user for fraud/onboarding gates. On 403 (common right
 * after signup while OpenFGA tuples propagate), force-refresh the OAuth token
 * once and retry so the browser can receive updated session cookies.
 */
export async function getUserWithAccessRetry(
  userId: string,
  cookieHeader: string | null,
  options?: { refreshBeforeRead?: boolean }
): Promise<UserAccessResult> {
  if (options?.refreshBeforeRead) {
    const refreshed = await retryAfterTokenRefresh(userId, cookieHeader);
    if (refreshed) {
      return refreshed;
    }
  }

  try {
    const user = await createUserService().get(userId);
    return { user };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return { error: 'not_found' };
    }

    if (error instanceof AuthorizationError) {
      const retried = await retryAfterTokenRefresh(userId, cookieHeader);
      if (retried) {
        return retried;
      }
      return { error: 'forbidden' };
    }

    return { error: 'other' };
  }
}

async function retryAfterTokenRefresh(
  userId: string,
  cookieHeader: string | null
): Promise<{ user: User; refreshedHeaders: Headers } | null> {
  const { refreshToken, rawSession: refreshRaw } = await AuthService.getRefreshToken(cookieHeader);
  const { rawSession: sessionRaw } = await AuthService.getSession(cookieHeader);

  if (!refreshToken) {
    return null;
  }

  try {
    const { session: newSession, headers } = await AuthService.refreshTokens(
      refreshToken,
      sessionRaw,
      refreshRaw
    );

    const reqCtx = getRequestContext();
    if (reqCtx) {
      reqCtx.token = newSession.accessToken;
    }

    const user = await createUserService().get(userId);
    return { user, refreshedHeaders: headers };
  } catch {
    return null;
  }
}

export function appendSetCookieHeaders(target: Headers, source?: Headers): void {
  if (!source) return;

  source.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      target.append('Set-Cookie', value);
    }
  });
}
