import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import { AppProvider } from '@/providers/app.provider';
import { createOrganizationService } from '@/resources/organizations';
import { createUserService } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { type LoaderFunctionArgs, Outlet, redirect, useLoaderData } from 'react-router';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    const user = await createUserService().get(session.sub);
    const pathname = new URL(request.url).pathname;
    const organizations = await createOrganizationService().list({ limit: 1 });

    const hasExistingOrgs = organizations.items.length > 0;
    const devBypass = isOnboardingDevBypassEnabled();

    if (!devBypass) {
      const finishingOnboarding =
        pathname === paths.onboarding.billing || pathname === paths.onboarding.provisioning;

      if (!hasExistingOrgs) {
        if (user.nameReviewRequired) {
          if (pathname !== paths.onboarding.profile) {
            return redirect(paths.onboarding.profile);
          }
        } else if (pathname === paths.onboarding.profile) {
          return redirect(paths.onboarding.account);
        }
      } else if (user.nameReviewRequired) {
        if (pathname !== paths.onboarding.profile) {
          return redirect(paths.onboarding.profile);
        }
      } else if (!finishingOnboarding) {
        return redirect(paths.home);
      }
    }

    return { user, hasExistingOrgs };
  } catch (userError) {
    if (userError instanceof NotFoundError || userError instanceof AuthorizationError) {
      return redirect(paths.fraud.verifying);
    }
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
