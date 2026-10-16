import { resolveReturnTo, type ReturnToAccess } from './post-login-access';
import { LogoIcon } from '@/components/logo/logo-icon';
import { authenticator } from '@/modules/auth/auth.server';
import { getRequestContext, withRequestContext } from '@/modules/axios/request-context';
import { createOrganizationService } from '@/resources/organizations';
import { createProjectService } from '@/resources/projects';
import { AUTH_CONFIG, AuthService, readEmailVerified } from '@/utils/auth';
import type { IAuthSession } from '@/utils/auth';
import { paths } from '@/utils/config/paths.config';
import {
  clearRedirectIntent,
  getRedirectIntent,
  getSession,
  setIdTokenSession,
} from '@/utils/cookies';
import { env } from '@/utils/env/env.server';
import { AuthenticationError } from '@/utils/errors';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
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

/**
 * Org and project reads made as the user who just signed in. The request has
 * no session yet, so the new access token is put in a fresh request context.
 */
function accessAs(accessToken: string, sub: string): ReturnToAccess {
  const ctx = {
    requestId: getRequestContext()?.requestId ?? '',
    token: accessToken,
    userId: sub,
    cookieHeader: null,
  };
  return {
    getOrganization: (orgId) =>
      withRequestContext({ ...ctx }, () => createOrganizationService().get(orgId)),
    getProject: (projectId) =>
      withRequestContext({ ...ctx }, () => createProjectService().get(projectId)),
  };
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
      emailVerified: readEmailVerified(idToken),
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

    // Get the intended redirect destination: restored only for the same user
    // and when the new access token can reach it.
    const redirectIntent = await getRedirectIntent(request);
    const destination = await resolveReturnTo({
      intentPath: redirectIntent?.path,
      intentSub: redirectIntent?.sub,
      sub: decoded.sub,
      allowedOrigins: env.server.websiteOrigins,
      fallback: paths.account.organizations.root,
      access: accessAs(rest.accessToken, decoded.sub),
    });

    if (redirectIntent?.path) {
      // Clear the redirect intent (one-time use)
      const clearHeaders = await clearRedirectIntent(request);
      headers = combineHeaders(headers, clearHeaders.headers);
    }

    // Redirect to the intended destination
    return redirect(destination, { headers });
  } catch (error) {
    // Surface the real reason the OAuth callback failed instead of silently bouncing to
    // login (which caused an invisible re-authorize loop → Zitadel ALREADY_DONE).
    console.error('[Auth Callback] authenticate failed:', error);
    return redirect(paths.auth.logIn);
  }
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
      <LogoIcon width={32} className="mb-4" />

      <>
        <SpinnerIcon size="lg" aria-hidden="true" />
        <Title as="h2" level={4} weight="semibold">
          Authenticating...
        </Title>
        <Text as="p" textColor="muted">
          Setting up your account...
        </Text>
      </>
    </div>
  );
}
