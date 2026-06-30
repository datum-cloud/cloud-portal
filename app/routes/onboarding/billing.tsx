import { type BillingAccount } from '@/features/billing/types';
import { BillingPage } from '@/features/onboarding/billing/billing-page';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createOrganizationService } from '@/resources/organizations/organization.service';
import { createStripeProviderConfigService } from '@/resources/stripe-provider-configs';
import { orgIdFromNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Payment verification');
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    const organizations = await createOrganizationService().list();

    const orgIds = organizations.items.map((o) => o.name);
    if (orgIds.length === 0) {
      return { status: 'empty' as const };
    }

    const accounts = await createBillingAccountService().listForOrgs(orgIds);
    const account: BillingAccount | undefined = accounts[0];
    if (!account?.metadata?.name) {
      return { status: 'empty' as const };
    }

    const namespace = account.metadata.namespace ?? '';
    const orgId = orgIdFromNamespace(namespace);
    if (!orgId) {
      return { status: 'empty' as const };
    }

    const stripeConfigs = await createStripeProviderConfigService()
      .list()
      .catch(() => []);
    const stripePublishableKey = stripeConfigs[0]?.spec?.publishableKey ?? undefined;

    return {
      status: 'ready' as const,
      orgId,
      accountName: account.metadata.name,
      namespace,
      stripePublishableKey,
    };
  } catch (userError) {
    if (userError instanceof NotFoundError || userError instanceof AuthorizationError) {
      return redirect(paths.fraud.verifying);
    }
    return redirect(paths.auth.logOut);
  }
};

export default function OnboardingBillingRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <OnboardingLayout width="wide">
      <BillingPage data={data} />
    </OnboardingLayout>
  );
}
