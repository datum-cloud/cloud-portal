import { AccountPage } from '@/features/onboarding/account/account-page';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import { createOrganizationService } from '@/resources/organizations';
import { createUserService } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account information');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    const user = await createUserService().get(session.sub);

    if (user.nameReviewRequired) {
      return redirect(paths.onboarding.profile);
    }

    const organizations = await createOrganizationService().list({ limit: 1 });
    const hasExistingOrgs = organizations.items.length > 0;

    if (hasExistingOrgs && !isOnboardingDevBypassEnabled()) {
      return redirect(paths.home);
    }

    return {
      userId: session.sub,
      fullName: user.fullName?.trim() || user.email || 'Your account',
      email: user.email ?? '',
      avatarUrl: user.avatarUrl,
      lastLoginProvider: user.lastLoginProvider,
      country: user.country ?? '',
    };
  } catch (userError) {
    if (userError instanceof NotFoundError || userError instanceof AuthorizationError) {
      return redirect(paths.fraud.verifying);
    }
    return redirect(paths.auth.logOut);
  }
};

export default function OnboardingAccountRoute() {
  const { userId, fullName, email, avatarUrl, lastLoginProvider, country } =
    useLoaderData<typeof loader>();

  return (
    <OnboardingLayout>
      <AccountPage
        userId={userId}
        fullName={fullName}
        email={email}
        avatarUrl={avatarUrl}
        lastLoginProvider={lastLoginProvider}
        country={country}
      />
    </OnboardingLayout>
  );
}
