import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { InvitationsPage } from '@/features/onboarding/invitations/invitations-page';
import { CREATE_OWN_ORGANIZATION_PATH } from '@/features/onboarding/invitations/joinable-invitations';
import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import {
  hasAnyOrganizations,
  listJoinableInvitations,
  loadOnboardingUser,
  onboardingAccessRedirect,
} from '@/features/onboarding/onboarding-user.server';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Join your team');
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

    if (user.nameReviewRequired) {
      return redirect(paths.onboarding.profile);
    }

    const hasExistingOrgs = await hasAnyOrganizations();

    if (hasExistingOrgs && !isOnboardingDevBypassEnabled()) {
      return redirect(paths.home);
    }

    const invitations = await listJoinableInvitations(session.sub, user.email);

    // Nothing left to join (all declined, expired, or the lookup failed):
    // carry on to org creation.
    if (invitations.length === 0) {
      return redirect(CREATE_OWN_ORGANIZATION_PATH);
    }

    return { invitations };
  } catch (userError) {
    if (userError instanceof NotFoundError || userError instanceof AuthorizationError) {
      return redirect(paths.fraud.verifying);
    }
    return redirect(paths.auth.logOut);
  }
};

export default function OnboardingInvitationsRoute() {
  const { invitations } = useLoaderData<typeof loader>();

  return (
    <OnboardingLayout>
      <InvitationsPage invitations={invitations} />
    </OnboardingLayout>
  );
}
