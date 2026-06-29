import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { ProvisioningPage } from '@/features/onboarding/provisioning/provisioning-page';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
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
      contentClassName="px-0 pt-0 pb-0 md:px-0 md:pt-0 md:pb-0 min-h-svh">
      <ProvisioningPage />
    </OnboardingLayout>
  );
}
