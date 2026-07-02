import { OnboardingEntrance } from '@/features/onboarding/components/onboarding-entrance';
import { onboardingCardClassName } from '@/features/onboarding/onboarding-layout';
import {
  orgDisplayNameFromContact,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { OrgBillingSetupForm } from '@/features/organization/billing/org-billing-setup-form';
import { paths } from '@/utils/config/paths.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useNavigate } from 'react-router';

export interface BillingFormProps {
  stripePublishableKey?: string;
  contactDefaults: Partial<OrgContactInfoValues>;
  initialSetup?: {
    orgId: string;
    accountName: string;
    namespace: string;
  };
  initialContactInfo?: OrgContactInfoValues;
  /** Org exists from a prior partial setup — billing account create will be retried. */
  partialOrgId?: string;
}

export const BillingForm = ({
  stripePublishableKey,
  contactDefaults,
  initialSetup,
  initialContactInfo,
  partialOrgId,
}: BillingFormProps) => {
  const navigate = useNavigate();

  return (
    <div className="z-10 flex w-full min-w-0 flex-col items-stretch gap-5">
      <OnboardingEntrance className="mx-auto w-full min-w-0 md:max-w-[410px]">
        <Card className={cn(onboardingCardClassName, 'flex flex-col md:self-stretch')}>
          <CardContent className="flex flex-col gap-8 p-0">
            <p className="text-muted-foreground text-1xs text-center tracking-[0.4px] uppercase">
              Step 2 / 2
            </p>

            <h2 className="text-center text-2xl font-semibold">Payment Verification</h2>

            <OrgBillingSetupForm
              stripePublishableKey={stripePublishableKey}
              contactDefaults={contactDefaults}
              initialSetup={initialSetup}
              initialContactInfo={initialContactInfo}
              partialOrgId={partialOrgId}
              submitLabel="Start free"
              onComplete={({ contactInfo }) => {
                navigate(paths.onboarding.provisioning, {
                  replace: false,
                  state: { orgName: orgDisplayNameFromContact(contactInfo) },
                });
              }}
            />
          </CardContent>
        </Card>
      </OnboardingEntrance>
    </div>
  );
};
