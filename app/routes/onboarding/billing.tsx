import { type BillingAccount } from '@/features/billing/types';
import { BillingPage } from '@/features/onboarding/billing/billing-page';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import {
  buildOrgContactDefaults,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createOrganizationService } from '@/resources/organizations/organization.service';
import { createStripeProviderConfigService } from '@/resources/stripe-provider-configs';
import { createUserService } from '@/resources/users';
import { orgIdFromNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Payment verification');
});

function contactInfoFromBillingAccount(account: BillingAccount): OrgContactInfoValues | undefined {
  const contact = account.spec?.contactInfo;
  if (!contact?.email?.trim() || !contact.name?.trim()) {
    return undefined;
  }

  return buildOrgContactDefaults({
    email: contact.email,
    name: contact.name,
    businessName: contact.businessName ?? '',
    country: contact.address?.country ?? '',
    line1: contact.address?.line1 ?? '',
    line2: contact.address?.line2 ?? '',
    city: contact.address?.city ?? '',
    region: contact.address?.region ?? '',
    postalCode: contact.address?.postalCode ?? '',
  });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await getSession(request);

  if (!session?.sub) {
    return redirect(paths.auth.logOut);
  }

  try {
    const user = await createUserService().get(session.sub);
    const contactDefaults: Partial<OrgContactInfoValues> = {
      email: user.email ?? '',
      name: user.fullName?.trim() || '',
      country: user.country ?? '',
    };

    const stripeConfigs = await createStripeProviderConfigService()
      .list()
      .catch(() => []);
    const stripePublishableKey = stripeConfigs[0]?.spec?.publishableKey ?? undefined;

    const organizations = await createOrganizationService().list();
    const org = organizations.items[0];

    if (org) {
      const accounts = await createBillingAccountService().list(org.name);
      const account: BillingAccount | undefined = accounts[0];

      if (account?.metadata?.name && account.metadata.namespace) {
        const orgId = orgIdFromNamespace(account.metadata.namespace) ?? org.name;
        return {
          contactDefaults,
          stripePublishableKey,
          initialSetup: {
            orgId,
            accountName: account.metadata.name,
            namespace: account.metadata.namespace,
          },
          initialContactInfo: contactInfoFromBillingAccount(account),
        };
      }

      return {
        contactDefaults,
        stripePublishableKey,
        partialOrgId: org.name,
      };
    }

    return {
      contactDefaults,
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
