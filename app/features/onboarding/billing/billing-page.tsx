import { BillingForm } from '@/features/onboarding/billing/billing-form';
import type { OrgContactInfoValues } from '@/features/onboarding/schemas/org-contact-info-schema';

export type BillingPageData = {
  contactDefaults: Partial<OrgContactInfoValues>;
  stripePublishableKey?: string;
  initialSetup?: {
    orgId: string;
    accountName: string;
    namespace: string;
  };
  initialContactInfo?: OrgContactInfoValues;
  partialOrgId?: string;
};

export const BillingPage = ({ data }: { data: BillingPageData }) => (
  <BillingForm
    stripePublishableKey={data.stripePublishableKey}
    contactDefaults={data.contactDefaults}
    initialSetup={data.initialSetup}
    initialContactInfo={data.initialContactInfo}
    partialOrgId={data.partialOrgId}
  />
);
