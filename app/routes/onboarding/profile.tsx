import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import { ProfilePage } from '@/features/onboarding/profile/profile-page';
import { createOrganizationService } from '@/resources/organizations';
import { createUserService } from '@/resources/users';
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
    const user = await createUserService().get(session.sub);
    const organizations = await createOrganizationService().list({ limit: 1 });
    const hasExistingOrgs = organizations.items.length > 0;

    if (!user.nameReviewRequired && !isOnboardingDevBypassEnabled()) {
      return redirect(hasExistingOrgs ? paths.home : paths.onboarding.account);
    }

    return {
      userId: session.sub,
      email: user.email ?? '',
      givenName: user.givenName ?? '',
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
  const { userId, email, givenName, hasExistingOrgs } = useLoaderData<typeof loader>();

  return (
    <OnboardingLayout>
      <ProfilePage
        userId={userId}
        email={email}
        givenName={givenName}
        hasExistingOrgs={hasExistingOrgs}
      />
    </OnboardingLayout>
  );
}
