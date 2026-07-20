import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { ProvisioningPage } from '@/features/onboarding/provisioning/provisioning-page';
import { isUserOrgOwner } from '@/resources/members/member-owner';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Setting up your account');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    // When provisioning targets a specific org, only its owners may proceed.
    const requestedOrgId = new URL(request.url).searchParams.get('orgId')?.trim();
    if (requestedOrgId && !(await isUserOrgOwner(requestedOrgId))) {
      return redirect(getPathWithParams(paths.org.detail.setupRequired, { orgId: requestedOrgId }));
    }

    return null;
  } catch (userError) {
    if (userError instanceof NotFoundError || userError instanceof AuthorizationError) {
      return redirect(paths.fraud.verifying);
    }
    return redirect(paths.auth.logOut);
  }
};

export default function OnboardingProvisioningRoute() {
  return (
    <OnboardingLayout
      width="full"
      splitBackground
      sceneOnTop
      contentClassName="justify-start px-0 py-0 md:px-0 md:py-0 min-h-svh">
      <ProvisioningPage />
    </OnboardingLayout>
  );
}
