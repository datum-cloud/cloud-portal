import { SetupProvisioningPage } from '@/features/onboarding/setup-provisioning-page';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLocation } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Setting up your account');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    return { status: 'ready' as const };
  } catch (userError) {
    if (userError instanceof NotFoundError || userError instanceof AuthorizationError) {
      return redirect(paths.fraud.verifying);
    }
    return redirect(paths.auth.logOut);
  }
};

export default function OnboardingProvisioningRoute() {
  const location = useLocation();
  const orgName =
    (location.state as { orgName?: string } | null)?.orgName?.trim() || 'your organization';

  return <SetupProvisioningPage orgName={orgName} />;
}
