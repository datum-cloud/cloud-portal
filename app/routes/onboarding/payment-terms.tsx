import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import {
  PAYMENT_OPTION_LABELS,
  applicationPhase,
  estimatedSpendLabel,
  latestApplication,
  paymentTermsSummary,
} from '@/features/billing/payment-terms';
import { selectDefaultOrgBillingAccount } from '@/features/billing/types';
import { OnboardingEntrance } from '@/features/onboarding/components/onboarding-entrance';
import { OnboardingLayout } from '@/features/onboarding/components/onboarding-layout';
import { isBillingAccountPaymentReady } from '@/features/onboarding/legacy-setup/org-setup-status';
import {
  loadOnboardingUser,
  onboardingAccessRedirect,
} from '@/features/onboarding/onboarding-user.server';
import { PaymentTermsApplicationForm } from '@/features/onboarding/payment-terms/application-form';
import {
  ApplicationApproved,
  ApplicationDeclined,
  ApplicationUnderReview,
  type ApplicationSummary,
} from '@/features/onboarding/payment-terms/application-status';
import {
  billingSettingsPath,
  cardSetupPath,
  readPaymentTermsSearch,
} from '@/features/onboarding/payment-terms/payment-terms-paths';
import {
  contactInfoFromBillingAccount,
  contactInfoFromOrganization,
} from '@/features/onboarding/schemas/contact-info-sources';
import { createBillingAccountService } from '@/resources/billing-accounts';
import { createBillingArrangementApplicationService } from '@/resources/billing-arrangement-applications';
import { isUserOrgOwner } from '@/resources/members/member-owner';
import { createOrganizationService } from '@/resources/organizations/organization.service';
import { loaderFailureRedirect, requireSessionSub } from '@/utils/auth/require-session.server';
import { paths } from '@/utils/config/paths.config';
import { env } from '@/utils/env';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { type LoaderFunctionArgs, type MetaFunction, redirect, useLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Payment terms'));

/**
 * "Apply for payment terms" and the application's status. Shows the form
 * when there's no application to report on (or the customer chose to apply
 * again), otherwise the latest application's review, approval or decline.
 */
export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const sub = await requireSessionSub(request, context);

  try {
    const access = await loadOnboardingUser(sub, request);
    if ('error' in access) return redirect(onboardingAccessRedirect(access));
    const { user } = access;

    const search = readPaymentTermsSearch(new URL(request.url));
    const { orgId, entry } = search;
    if (!orgId) {
      return redirect(paths.onboarding.billing);
    }

    // Finishing an org's setup is for owners, as on the billing step. From
    // billing settings, billing's own permissions decide who can apply.
    if (entry !== 'settings' && !(await isUserOrgOwner(orgId))) {
      return redirect(getPathWithParams(paths.org.detail.setupRequired, { orgId }));
    }

    const [org, accounts] = await Promise.all([
      createOrganizationService().get(orgId),
      createBillingAccountService().list(orgId),
    ]);
    const account = search.billingAccountName
      ? accounts.find((item) => item.metadata?.name === search.billingAccountName)
      : selectDefaultOrgBillingAccount(accounts);
    const billingAccountName = account?.metadata?.name;

    // Applying needs a billing account with contact details and an address,
    // which the billing step saves. Send the owner there first.
    const contact = account?.spec?.contactInfo;
    if (!account || !billingAccountName || !contact?.email || !contact.address) {
      return redirect(
        entry === 'settings' && billingAccountName
          ? billingSettingsPath(billingAccountName)
          : `${paths.onboarding.billing}?orgId=${encodeURIComponent(orgId)}`
      );
    }

    const applications = await createBillingArrangementApplicationService().list(orgId);
    const application = latestApplication(applications, billingAccountName);
    const phase = application ? applicationPhase(application) : undefined;
    const currency = account.spec?.currencyCode ?? 'USD';

    const view =
      search.apply || !application || phase === 'Withdrawn'
        ? ('form' as const)
        : phase === 'Approved'
          ? ('approved' as const)
          : phase === 'Declined'
            ? ('declined' as const)
            : ('pending' as const);

    // With PAYMENT_TERMS_ENABLED off there's nothing to apply with, so send
    // the customer to the card form. An existing application still shows.
    const canApply = env.public.paymentTermsEnabled;
    if (view === 'form' && !canApply) {
      return redirect(cardSetupPath({ orgId, entry, billingAccountName }));
    }

    const invoice = application?.spec?.invoice;
    const summary: ApplicationSummary | undefined =
      application?.metadata?.name && application.spec
        ? {
            name: application.metadata.name,
            paymentOptionLabel: PAYMENT_OPTION_LABELS[application.spec.paymentOption],
            estimatedSpendLabel: invoice
              ? estimatedSpendLabel(invoice.estimatedMonthlySpend, currency)
              : undefined,
            accountsPayableEmail: invoice?.accountsPayableEmail,
            purchaseOrderNumber: invoice?.purchaseOrderNumber,
            submittedAt: application.metadata.creationTimestamp,
            declineMessage: application.status?.declineMessage,
          }
        : undefined;

    return {
      view,
      orgId,
      entry,
      billingAccountName,
      orgDisplayName: org.displayName?.trim() || org.name,
      currency,
      applicant: { firstName: user.givenName?.trim() || undefined, email: user.email ?? undefined },
      application: summary,
      terms: paymentTermsSummary(account),
      contactInfo: contactInfoFromOrganization(org) ?? contactInfoFromBillingAccount(account),
      defaultLegalName: contact.businessName?.trim() || undefined,
      /** The account already pays by card, so applying doesn't block anything. */
      canBeBilled: isBillingAccountPaymentReady(account),
      canApply,
    };
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      return redirect(paths.account.organizations.root);
    }
    return redirect(loaderFailureRedirect(error, request));
  }
};

export default function OnboardingPaymentTermsRoute() {
  const data = useLoaderData<typeof loader>();
  const context = {
    orgId: data.orgId,
    billingAccountName: data.billingAccountName,
    orgDisplayName: data.orgDisplayName,
    entry: data.entry,
    applicant: data.applicant,
  };

  if (data.view === 'form' || !data.application) {
    return (
      <OnboardingLayout width="wide">
        <PaymentTermsApplicationForm
          orgId={data.orgId}
          billingAccountName={data.billingAccountName}
          orgDisplayName={data.orgDisplayName}
          entry={data.entry}
          currency={data.currency}
          defaultLegalName={data.defaultLegalName}
        />
      </OnboardingLayout>
    );
  }

  // The status pages share the onboarding layout with the form and the
  // billing step, so applying reads as one flow.
  return (
    <OnboardingLayout width="wide">
      <OnboardingEntrance className="mx-auto flex w-full max-w-[480px] min-w-0">
        <ConfirmationDialogProvider>
          {data.view === 'approved' ? (
            <ApplicationApproved
              context={context}
              terms={data.terms}
              contactInfo={data.contactInfo}
            />
          ) : data.view === 'declined' ? (
            <ApplicationDeclined
              context={context}
              application={data.application}
              canApplyAgain={data.canApply}
            />
          ) : (
            <ApplicationUnderReview context={context} application={data.application} />
          )}
        </ConfirmationDialogProvider>
      </OnboardingEntrance>
    </OnboardingLayout>
  );
}
