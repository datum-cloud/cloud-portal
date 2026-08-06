import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import { resolveOnboardingLayoutRedirect } from '@/features/onboarding/onboarding-layout-redirect';
import { useNonce } from '@/hooks/useNonce';
import { HelpScoutBeacon } from '@/modules/helpscout';
import { RybbitProvider } from '@/modules/rybbit';
import { AppProvider, useApp } from '@/providers/app.provider';
import { isUserOrgOwner } from '@/resources/members/member-owner';
import { createOrganizationService } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { env } from '@/utils/env';
import { env as serverEnv } from '@/utils/env/env.server';
import { appendSetCookieHeaders, getUserWithAccessRetry } from '@/utils/fraud/user-access';
import { getDocumentPathname } from '@/utils/helpers/path.helper';
import { resolveUserFraudRedirectPath } from '@/utils/middlewares/fraud-redirect';
import { createHmac } from 'crypto';
import type { ReactNode } from 'react';
import { type LoaderFunctionArgs, Outlet, data, redirect, useLoaderData } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  const cookieHeader = request.headers.get('Cookie');
  const access = await getUserWithAccessRetry(session.sub, cookieHeader, {
    refreshBeforeRead: true,
  });

  if ('error' in access) {
    if (access.error === 'not_found' || access.error === 'forbidden') {
      return redirect(paths.fraud.verifying);
    }
    return redirect(paths.auth.logOut);
  }

  const { user, refreshedHeaders } = access;
  const responseHeaders = new Headers();
  appendSetCookieHeaders(responseHeaders, refreshedHeaders);
  const redirectWithCookies = (path: string) => redirect(path, { headers: responseHeaders });

  const url = new URL(request.url);
  // Soft navigations request `*.data`; compare against the document path.
  const pathname = getDocumentPathname(request);
  const fraudRedirect = resolveUserFraudRedirectPath(user, pathname);
  if (fraudRedirect) {
    return redirectWithCookies(fraudRedirect);
  }

  try {
    const requestedOrgId = url.searchParams.get('orgId')?.trim() || undefined;
    const organizations = await createOrganizationService().list({ limit: 1 });

    const hasExistingOrgs = organizations.items.length > 0;
    const devBypass = isOnboardingDevBypassEnabled();

    if (!devBypass) {
      const finishingOnboarding =
        pathname === paths.onboarding.billing || pathname === paths.onboarding.provisioning;
      const isOwnerOfRequestedOrg =
        finishingOnboarding && requestedOrgId ? await isUserOrgOwner(requestedOrgId) : true;

      const layoutRedirect = resolveOnboardingLayoutRedirect({
        pathname,
        hasExistingOrgs,
        nameReviewRequired: Boolean(user.nameReviewRequired),
        requestedOrgId,
        isOwnerOfRequestedOrg,
      });
      if (layoutRedirect) {
        return redirectWithCookies(layoutRedirect);
      }
    }

    // HelpScout is mounted here too (the onboarding routes live outside the
    // private layout) so support chat can be opened from the billing resume
    // notice card.
    const helpscoutBeaconId = serverEnv.public.helpscoutBeaconId ?? null;
    const helpscoutSignature =
      helpscoutBeaconId && serverEnv.server.helpscoutSecretKey
        ? createHmac('sha256', serverEnv.server.helpscoutSecretKey)
            .update(user.email ?? user.sub ?? '')
            .digest('hex')
        : null;

    return data(
      { user, hasExistingOrgs, helpscoutBeaconId, helpscoutSignature },
      { headers: responseHeaders }
    );
  } catch {
    return redirect(paths.auth.logOut);
  }
};

function RybbitWrapper({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const nonce = useNonce();

  if (!env.public.rybbitSiteId) {
    return <>{children}</>;
  }

  return (
    <RybbitProvider
      siteId={env.public.rybbitSiteId}
      tag={env.public.rybbitTag}
      nonce={nonce}
      identity={user?.sub ? { sub: user.sub, email: user.email, name: user.fullName } : null}>
      {children}
    </RybbitProvider>
  );
}

export default function OnboardingRouteLayout() {
  const { user, helpscoutBeaconId, helpscoutSignature } = useLoaderData<typeof loader>();

  return (
    <AppProvider initialUser={user}>
      <RybbitWrapper>
        <Outlet />
      </RybbitWrapper>

      {helpscoutBeaconId && helpscoutSignature ? (
        <HelpScoutBeacon
          beaconId={helpscoutBeaconId}
          displayStyle="manual"
          user={{
            name: `${user.givenName} ${user.familyName}`,
            email: user.email ?? user.sub ?? '',
            signature: helpscoutSignature,
          }}
        />
      ) : null}
    </AppProvider>
  );
}
