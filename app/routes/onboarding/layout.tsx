import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import { AppProvider } from '@/providers/app.provider';
import { isUserOrgOwner } from '@/resources/members/member-owner';
import { createOrganizationService } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { appendSetCookieHeaders, getUserWithAccessRetry } from '@/utils/fraud/user-access';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { resolveUserFraudRedirectPath } from '@/utils/middlewares/fraud-redirect';
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
  const pathname = url.pathname;
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

      if (!hasExistingOrgs) {
        if (user.nameReviewRequired) {
          if (pathname !== paths.onboarding.profile) {
            return redirectWithCookies(paths.onboarding.profile);
          }
        } else if (pathname === paths.onboarding.profile) {
          return redirectWithCookies(paths.onboarding.account);
        }
      } else if (user.nameReviewRequired) {
        if (pathname !== paths.onboarding.profile) {
          return redirectWithCookies(paths.onboarding.profile);
        }
      } else if (finishingOnboarding) {
        // Finishing setup for a specific org: only its owners may do so.
        if (requestedOrgId) {
          if (!(await isUserOrgOwner(requestedOrgId))) {
            return redirectWithCookies(
              getPathWithParams(paths.org.detail.setupRequired, { orgId: requestedOrgId })
            );
          }
        } else if (pathname === paths.onboarding.billing) {
          // Existing-org user hit billing with no target org — nothing to set up.
          return redirectWithCookies(paths.home);
        }
      } else {
        return redirectWithCookies(paths.home);
      }
    }

    return data({ user, hasExistingOrgs }, { headers: responseHeaders });
  } catch {
    return redirect(paths.auth.logOut);
  }
};

export default function OnboardingRouteLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <AppProvider initialUser={user}>
      <Outlet />
    </AppProvider>
  );
}
