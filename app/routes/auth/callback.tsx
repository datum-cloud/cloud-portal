import { LogoIcon } from '@/components/logo/logo-icon';
import { authenticator } from '@/modules/auth/auth.server';
import { AUTH_CONFIG, AuthService } from '@/utils/auth';
import type { IAuthSession } from '@/utils/auth';
import { paths } from '@/utils/config/paths.config';
import {
  clearRedirectIntent,
  getRedirectIntent,
  getSession,
  isValidRedirectPath,
  setIdTokenSession,
} from '@/utils/cookies';
import { AuthenticationError } from '@/utils/errors';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { SpinnerIcon } from '@datum-ui/components';
import { jwtDecode } from 'jwt-decode';
import { LoaderFunctionArgs, redirect } from 'react-router';

/**
 * Debug logger - only logs in development
 */
function debugLog(message: string, data?: Record<string, unknown>): void {
  if (AUTH_CONFIG.DEBUG) {
    console.log(`[Auth Callback] ${message}`, data ?? '');
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const session = await getSession(request);

    // Redirect if already authenticated
    if (session.session) {
      return redirect(paths.home, { headers: session.headers });
    }

    // Authenticate user
    const credentials: IAuthSession | undefined = await authenticator.authenticate(
      'zitadel',
      request
    );
    if (!credentials) {
      throw new AuthenticationError('Authentication failed');
    }

    const { idToken, refreshToken, ...rest } = credentials;

    const cookieHeader = request.headers.get('Cookie');

    debugLog('Received tokens', {
      hasAccessToken: !!rest.accessToken,
      hasIdToken: !!idToken,
      hasRefreshToken: !!refreshToken,
      expiredAt: rest.expiredAt,
    });

    // Decode Access token to get sub
    const decoded = jwtDecode<{ sub: string; email: string }>(rest.accessToken);

    // Handle access token session (short-lived cookie)
    const sessionHeaders = await AuthService.setSession(cookieHeader, {
      accessToken: rest.accessToken,
      expiredAt: rest.expiredAt,
      sub: decoded.sub,
    });

    // Handle refresh token (long-lived cookie) - SEPARATE from session
    let refreshTokenHeaders: Headers | undefined;
    if (refreshToken) {
      debugLog('Storing refresh token in cookie');
      refreshTokenHeaders = await AuthService.setRefreshToken(cookieHeader, refreshToken);
    } else {
      console.warn('[Auth Callback] No refresh token received from Zitadel!');
    }

    // Handle id token session
    let idTokenHeaders: Headers | undefined;
    if (idToken) {
      const idTokenResponse = await setIdTokenSession(request, idToken);
      idTokenHeaders = idTokenResponse.headers;
    }

    // Combine all headers
    let headers = combineHeaders(sessionHeaders, refreshTokenHeaders, idTokenHeaders);

    // Get the intended redirect destination
    const redirectIntent = await getRedirectIntent(request);
    let destination = paths.account.organizations.root; // default fallback

    if (redirectIntent?.path) {
      // Validate it's a safe internal path
      const isValid = isValidRedirectPath(redirectIntent.path);
      if (isValid) {
        destination = redirectIntent.path;
      }

      // Clear the redirect intent (one-time use)
      const clearHeaders = await clearRedirectIntent(request);
      headers = combineHeaders(headers, clearHeaders.headers);
    }

    // Redirect to the intended destination
    return redirect(destination, { headers });
  } catch {
    return redirect(paths.auth.logIn);
  }
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
      <LogoIcon width={32} className="mb-4" />

      <>
        <SpinnerIcon size="lg" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Authenticating...</h2>
        <p className="text-muted-foreground text-sm">Setting up your account...</p>
      </>
    </div>
  );
}
