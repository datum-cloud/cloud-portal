import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import {
  hasAnyOrganizations,
  loadOnboardingUser,
  onboardingAccessRedirect,
} from '@/features/onboarding/onboarding-user.server';
import { ProfilePage } from '@/features/onboarding/profile/profile-page';
import { loaderFailureRedirect, requireSessionSub } from '@/utils/auth/require-session.server';
import { paths } from '@/utils/config/paths.config';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Complete your profile');
});

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const sub = await requireSessionSub(request, context);

  try {
    const access = await loadOnboardingUser(sub, request);
    if ('error' in access) return redirect(onboardingAccessRedirect(access));
    const { user } = access;
    const hasExistingOrgs = await hasAnyOrganizations();

    if (!user.nameReviewRequired && !isOnboardingDevBypassEnabled()) {
      return redirect(hasExistingOrgs ? paths.home : paths.onboarding.account);
    }

    return {
      userId: sub,
      email: user.email ?? '',
      givenName: user.givenName ?? '',
      lastLoginProvider: user.lastLoginProvider,
      hasExistingOrgs,
    };
  } catch (userError) {
    if (userError instanceof NotFoundError || userError instanceof AuthorizationError) {
      return redirect(paths.fraud.verifying);
    }
    return redirect(loaderFailureRedirect(userError, request));
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
