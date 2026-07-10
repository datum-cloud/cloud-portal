import { type BillingAccount, selectDefaultOrgBillingAccount } from '@/features/billing/types';
import { BillingPage, type BillingPageData } from '@/features/onboarding/billing/billing-page';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import {
  buildOrgContactDefaults,
  orgContactInfoToFormValues,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { isUserOrgOwner } from '@/resources/members/member-owner';
import { createOrganizationService } from '@/resources/organizations/organization.service';
import { createPaymentMethodService } from '@/resources/payment-methods';
import { createStripeProviderConfigService } from '@/resources/stripe-provider-configs';
import { createUserService } from '@/resources/users';
import { orgIdFromNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { getSession } from '@/utils/cookies';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
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

function contactInfoFromOrganization(
  org: Awaited<ReturnType<ReturnType<typeof createOrganizationService>['get']>>
): OrgContactInfoValues | undefined {
  const values = orgContactInfoToFormValues(org.contactInfo);
  if (!values.email?.trim() || !values.name?.trim()) {
    return undefined;
  }
  return buildOrgContactDefaults(values);
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

    const url = new URL(request.url);
    const requestedOrgId = url.searchParams.get('orgId')?.trim() || undefined;

    const organizations = await createOrganizationService().list();
    const org = requestedOrgId
      ? (organizations.items.find((item) => item.name === requestedOrgId) ??
        (await createOrganizationService()
          .get(requestedOrgId)
          .catch(() => null)))
      : organizations.items[0];

    if (org) {
      const orgId = org.name;

      // Only owners can complete billing setup for an existing org. Non-owners
      // are pointed at the org's owners on the setup-required page.
      if (!(await isUserOrgOwner(orgId))) {
        return redirect(getPathWithParams(paths.org.detail.setupRequired, { orgId }));
      }

      const fullOrg = org.contactInfo ? org : await createOrganizationService().get(orgId);
      const orgContactInfo = contactInfoFromOrganization(fullOrg);

      const accounts = await createBillingAccountService().list(orgId);
      const account: BillingAccount | undefined = selectDefaultOrgBillingAccount(accounts);
      const paymentMethods = await createPaymentMethodService()
        .list(orgId)
        .catch(() => []);
      const activePaymentMethod = account?.metadata?.name
        ? paymentMethods.find(
            (method) =>
              method.spec?.billingAccountRef?.name === account.metadata?.name &&
              method.status?.phase === 'Active'
          )
        : undefined;
      const hasActivePayment = Boolean(activePaymentMethod);

      const isLegacySetupResume = Boolean(requestedOrgId);

      if (account?.metadata?.name && account.metadata.namespace) {
        const resolvedOrgId = orgIdFromNamespace(account.metadata.namespace) ?? orgId;
        const activeCard = activePaymentMethod?.status?.details?.card;
        return {
          contactDefaults,
          stripePublishableKey,
          isLegacySetupResume,
          orgDisplayName: fullOrg.displayName?.trim() || fullOrg.name,
          initialSetup: {
            orgId: resolvedOrgId,
            accountName: account.metadata.name,
            namespace: account.metadata.namespace,
          },
          initialContactInfo: orgContactInfo ?? contactInfoFromBillingAccount(account),
          initialPayment: activeCard?.last4
            ? { brand: activeCard.brand, last4: activeCard.last4 }
            : undefined,
          needsPaymentOnly: !hasActivePayment,
        } satisfies BillingPageData;
      }

      return {
        contactDefaults,
        stripePublishableKey,
        isLegacySetupResume,
        orgDisplayName: fullOrg.displayName?.trim() || fullOrg.name,
        partialOrgId: orgId,
        initialContactInfo: orgContactInfo,
      } satisfies BillingPageData;
    }

    return {
      contactDefaults,
      stripePublishableKey,
      isLegacySetupResume: false,
    } satisfies BillingPageData;
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
