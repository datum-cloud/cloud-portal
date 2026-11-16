import { AccountPage } from '@/features/onboarding/account/account-page';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import {
  hasAnyOrganizations,
  listJoinableInvitations,
  loadOnboardingUser,
  onboardingAccessRedirect,
} from '@/features/onboarding/onboarding-user.server';
import { loaderFailureRedirect, requireSessionSub } from '@/utils/auth/require-session.server';
import { paths } from '@/utils/config/paths.config';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Account information');
});

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const sub = await requireSessionSub(request, context);

  try {
    const access = await loadOnboardingUser(sub, request);
    if ('error' in access) return redirect(onboardingAccessRedirect(access));
    const { user } = access;

    if (user.nameReviewRequired) {
      return redirect(paths.onboarding.profile);
    }

    const hasExistingOrgs = await hasAnyOrganizations();

    if (hasExistingOrgs && !isOnboardingDevBypassEnabled()) {
      return redirect(paths.home);
    }

    // Everyone confirms their country and the terms here first. Then anyone
    // with an organization to join (an invitation, or an email domain offer)
    // sees those before creating, and paying for, an org of their own.
    const invitations = await listJoinableInvitations(sub, user.email);
    const nextPath =
      invitations.length > 0 ? paths.onboarding.invitations : paths.onboarding.billing;

    return {
      nextPath,
      userId: sub,
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
    return redirect(loaderFailureRedirect(userError, request));
  }
};

export default function OnboardingAccountRoute() {
  const { nextPath, userId, fullName, email, avatarUrl, lastLoginProvider, country } =
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
        nextPath={nextPath}
      />
    </OnboardingLayout>
  );
}
