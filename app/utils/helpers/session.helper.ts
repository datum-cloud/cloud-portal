import { routes } from '@/constants/routes';
import { authenticator } from '@/modules/auth/auth.server';
import { zitadelStrategy } from '@/modules/auth/strategies/zitadel.server';
import { sessionCookie } from '@/utils/cookies/session';
import { jwtDecode } from 'jwt-decode';
import { redirect } from 'react-router';

/**
 * Checks if the user is authenticated and redirects to the login page if not
 * @param request Request object
 * @param redirectTo Optional redirect URL
 * @param noAuthRedirect Optional flag to redirect to the login page if the user is not authenticated
 * @returns Response with either a redirect to the login page or the original request
 */
export async function isAuthenticated(
  request: Request,
  redirectTo?: string,
  noAuthRedirect?: boolean
) {
  const { data: session, headers } = await sessionCookie.get(request);
  let currentHeaders = headers;

  if (!session) {
    if (noAuthRedirect) {
      return redirect(routes.auth.logOut, {
        headers: currentHeaders,
      });
    }

    // Generate a new request without search params
    const url = new URL(request.url);
    url.search = '';

    // Redirect to OIDC Page
    return authenticator.authenticate('zitadel', new Request(url.toString(), request));
  } else {
    // Convert expiredAt to timestamp
    const tokenExpiryTime = new Date(session.expiredAt).getTime();

    // Check if session is expired
    if (tokenExpiryTime < Date.now()) {
      return redirect(routes.auth.logOut, {
        headers: currentHeaders,
      });
    }

    // Only refresh token if it's about to expire (e.g., within 5 minutes)
    const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds
    const currentTime = Date.now();
    const timeUntilExpiry = tokenExpiryTime - currentTime;

    // Refresh token only if it's about to expire (within 5 minutes) or already expired
    if (session.refreshToken && timeUntilExpiry < FIVE_MINUTES) {
      try {
        const refreshSession = await zitadelStrategy.refreshToken(session.refreshToken);

        const decoded = jwtDecode<{ sub: string; email: string }>(refreshSession.accessToken());

        const { headers: sessionHeaders } = await sessionCookie.set(request, {
          accessToken: refreshSession.accessToken(),
          refreshToken: refreshSession.refreshToken(),
          expiredAt: refreshSession.accessTokenExpiresAt(),
          sub: decoded.sub,
        });

        currentHeaders = sessionHeaders;
      } catch (error) {
        console.error('Refresh token failed:', error);
        // If refresh fails, log the user out
        return redirect(routes.auth.logOut, {
          headers: currentHeaders,
        });
      }
    }

    if (redirectTo) {
      return redirect(redirectTo, { headers: currentHeaders });
    }

    return true;
  }
}
