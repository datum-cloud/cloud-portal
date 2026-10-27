import { applicationPhase, latestApplication } from '@/features/billing/payment-terms';
import { paymentTermsPath } from '@/features/billing/payment-terms-paths';
import { type BillingAccount, selectDefaultOrgBillingAccount } from '@/features/billing/types';
import { BillingPage, type BillingPageData } from '@/features/onboarding/billing/billing-page';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import {
  hasActiveInvoiceTerms,
  isOrgContactSetupComplete,
} from '@/features/onboarding/legacy-setup/org-setup-status';
import {
  loadOnboardingUser,
  onboardingAccessRedirect,
} from '@/features/onboarding/onboarding-user.server';
import {
  contactInfoFromBillingAccount,
  contactInfoFromOrganization,
} from '@/features/onboarding/schemas/contact-info-sources';
import { type OrgContactInfoValues } from '@/features/onboarding/schemas/org-contact-info-schema';
import { logger } from '@/modules/logger';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createBillingArrangementApplicationService } from '@/resources/billing-arrangement-applications';
import { isUserOrgOwner } from '@/resources/members/member-owner';
import { createOrganizationService } from '@/resources/organizations/organization.service';
import { createPaymentMethodService } from '@/resources/payment-methods';
import { createStripeProviderConfigService } from '@/resources/stripe-provider-configs';
import { loaderFailureRedirect, requireSessionSub } from '@/utils/auth/require-session.server';
import { orgIdFromNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Payment verification');
});

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const sub = await requireSessionSub(request, context);

  try {
    const access = await loadOnboardingUser(sub, request);
    if ('error' in access) return redirect(onboardingAccessRedirect(access));
    const { user } = access;
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
      const onInvoiceTerms = hasActiveInvoiceTerms(account);

      // An owner who applied for payment terms sees the application's status
      // instead of the card form: while it awaits review, and after a decline
      // unless they chose "Add a card" (`method=card`).
      if (account?.metadata?.name && !hasActivePayment && !onInvoiceTerms) {
        const applications = await createBillingArrangementApplicationService()
          .list(orgId)
          .catch((error) => {
            logger.warn('[onboarding/billing] Could not list payment terms applications', {
              orgId,
              fallback: 'showing the card form',
              error: error instanceof Error ? error.message : String(error),
            });
            return [];
          });
        const application = latestApplication(applications, account.metadata.name);
        const phase = application ? applicationPhase(application) : undefined;
        if (
          phase === 'Pending' ||
          (phase === 'Declined' && url.searchParams.get('method') !== 'card')
        ) {
          return redirect(
            paymentTermsPath({ orgId, entry: requestedOrgId ? 'setup' : 'onboarding' })
          );
        }
      }

      // Staff have granted this org invoice terms, so there's no card to add.
      // Once contact info is saved, setup is complete: send them into the org
      // rather than showing a card form they don't need.
      if (!hasActivePayment && onInvoiceTerms && isOrgContactSetupComplete(fullOrg)) {
        return redirect(getPathWithParams(paths.org.detail.projects.root, { orgId }));
      }

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
          needsPaymentOnly: !hasActivePayment && !onInvoiceTerms,
          onInvoiceTerms,
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
    return redirect(loaderFailureRedirect(userError, request));
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
