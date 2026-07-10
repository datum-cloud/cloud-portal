import { BillingForm } from '@/features/onboarding/billing/billing-form';
import type { OrgContactInfoValues } from '@/features/onboarding/schemas/org-contact-info-schema';

export type BillingPageData = {
  contactDefaults: Partial<OrgContactInfoValues>;
  stripePublishableKey?: string;
  isLegacySetupResume?: boolean;
  orgDisplayName?: string;
  initialSetup?: {
    orgId: string;
    accountName: string;
    namespace: string;
  };
  initialContactInfo?: OrgContactInfoValues;
  /** Existing active card on the account, so resume shows it as already added. */
  initialPayment?: { brand?: string | null; last4: string };
  /** Org exists from a prior partial setup — billing account create will be retried. */
  partialOrgId?: string;
  /** Billing account exists but payment method is still required. */
  needsPaymentOnly?: boolean;
  /** Personalizes the legacy-resume notice card heading. */
  userGivenName?: string;
};

export const BillingPage = ({ data }: { data: BillingPageData }) => (
  <BillingForm
    stripePublishableKey={data.stripePublishableKey}
    contactDefaults={data.contactDefaults}
    isLegacySetupResume={data.isLegacySetupResume ?? false}
    orgDisplayName={data.orgDisplayName}
    initialSetup={data.initialSetup}
    initialContactInfo={data.initialContactInfo}
    initialPayment={data.initialPayment}
    partialOrgId={data.partialOrgId}
    needsPaymentOnly={data.needsPaymentOnly}
    userFirstName={data.userGivenName}
  />
);
