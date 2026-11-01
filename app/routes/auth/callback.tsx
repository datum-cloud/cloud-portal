import { handleAuthCallback } from './callback.server';
import type { ReturnToAccess } from './post-login-access';
import { LogoIcon } from '@/components/logo/logo-icon';
import { authenticator } from '@/modules/auth/auth.server';
import { getRequestContext, withRequestContext } from '@/modules/axios/request-context';
import { createOrganizationService } from '@/resources/organizations';
import { createProjectService } from '@/resources/projects';
import { AuthService, readEmailVerified } from '@/utils/auth';
import {
  clearRedirectIntent,
  getRedirectIntent,
  getSession,
  setIdTokenSession,
} from '@/utils/cookies';
import { env } from '@/utils/env/env.server';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { LoaderFunctionArgs } from 'react-router';

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
  return handleAuthCallback(request, {
    getSession,
    authenticate: (req) => authenticator.authenticate('zitadel', req),
    setSession: (cookieHeader, session) => AuthService.setSession(cookieHeader, session),
    setRefreshToken: (cookieHeader, refreshToken) =>
      AuthService.setRefreshToken(cookieHeader, refreshToken),
    readEmailVerified,
    setIdTokenSession,
    getRedirectIntent,
    clearRedirectIntent,
    allowedOrigins: env.server.websiteOrigins,
    accessFor: accessAs,
  });
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
