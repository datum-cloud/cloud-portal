import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import {
  hasAnyOrganizations,
  loadOnboardingUser,
  onboardingAccessRedirect,
} from '@/features/onboarding/onboarding-user.server';
import { ProfilePage } from '@/features/onboarding/profile/profile-page';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Complete your profile');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    const access = await loadOnboardingUser(session.sub, request);
    if ('error' in access) return redirect(onboardingAccessRedirect(access));
    const { user } = access;
    const hasExistingOrgs = await hasAnyOrganizations();

    if (!user.nameReviewRequired && !isOnboardingDevBypassEnabled()) {
      return redirect(hasExistingOrgs ? paths.home : paths.onboarding.account);
    }

    return {
      userId: session.sub,
      email: user.email ?? '',
      givenName: user.givenName ?? '',
      lastLoginProvider: user.lastLoginProvider,
      hasExistingOrgs,
    };
  } catch (userError) {
    if (userError instanceof NotFoundError || userError instanceof AuthorizationError) {
      return redirect(paths.fraud.verifying);
    }
    return redirect(paths.auth.logOut);
  }
};

export default function OnboardingProfileRoute() {
  const { userId, email, givenName, lastLoginProvider, hasExistingOrgs } =
    useLoaderData<typeof loader>();

  return (
    <OnboardingLayout>
      <ProfilePage
        userId={userId}
        email={email}
        givenName={givenName}
        lastLoginProvider={lastLoginProvider}
        hasExistingOrgs={hasExistingOrgs}
      />
    </OnboardingLayout>
  );
}
