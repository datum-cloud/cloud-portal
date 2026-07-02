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
  /** Org exists from a prior partial setup — billing account create will be retried. */
  partialOrgId?: string;
  /** Billing account exists but payment method is still required. */
  needsPaymentOnly?: boolean;
};

export const BillingPage = ({ data }: { data: BillingPageData }) => (
  <BillingForm
    stripePublishableKey={data.stripePublishableKey}
    contactDefaults={data.contactDefaults}
    isLegacySetupResume={data.isLegacySetupResume ?? false}
    orgDisplayName={data.orgDisplayName}
    initialSetup={data.initialSetup}
    initialContactInfo={data.initialContactInfo}
    partialOrgId={data.partialOrgId}
    needsPaymentOnly={data.needsPaymentOnly}
  />
);
