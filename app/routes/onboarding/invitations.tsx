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
import { loaderFailureRedirect, requireSessionSub } from '@/utils/auth/require-session.server';
import { paths } from '@/utils/config/paths.config';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Join your team');
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

    const invitations = await listJoinableInvitations(sub, user.email);

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
    return redirect(loaderFailureRedirect(userError, request));
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
