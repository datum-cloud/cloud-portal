import {
  useCompleteLegacyOrgSetup,
  useSetupOnboardingProject,
} from '@/features/onboarding/billing/use-setup-onboarding-project';
import { OnboardingEntrance } from '@/features/onboarding/components/onboarding-entrance';
import { onboardingCardClassName } from '@/features/onboarding/onboarding-layout';
import {
  orgDisplayNameFromContact,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { OrgBillingSetupForm } from '@/features/organization/billing/org-billing-setup-form';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useNavigate } from 'react-router';

export interface BillingFormProps {
  stripePublishableKey?: string;
  contactDefaults: Partial<OrgContactInfoValues>;
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
  needsPaymentOnly?: boolean;
}

export const BillingForm = ({
  stripePublishableKey,
  contactDefaults,
  isLegacySetupResume = false,
  orgDisplayName,
  initialSetup,
  initialContactInfo,
  partialOrgId,
  needsPaymentOnly = false,
}: BillingFormProps) => {
  const navigate = useNavigate();

  const setupProjectMutation = useSetupOnboardingProject({
    onError: (error) => {
      toast.error('Project setup', {
        description: error.message ?? 'Failed to create your first project',
      });
    },
  });

  const completeLegacySetupMutation = useCompleteLegacyOrgSetup({
    onError: (error) => {
      toast.error('Billing setup', {
        description: error.message ?? 'Failed to finish organization billing setup',
      });
    },
  });

  const stepLabel = isLegacySetupResume ? 'Billing setup' : 'Step 2 / 2';
  const heading = isLegacySetupResume ? 'Complete billing setup' : 'Payment Verification';
  const submitLabel = isLegacySetupResume ? 'Continue' : 'Start free';

  return (
    <div className="z-10 flex w-full min-w-0 flex-col items-stretch gap-5">
      <OnboardingEntrance className="mx-auto w-full min-w-0 md:max-w-[410px]">
        <Card className={cn(onboardingCardClassName, 'flex flex-col md:self-stretch')}>
          <CardContent className="flex flex-col gap-8 p-0">
            <p className="text-muted-foreground text-1xs text-center tracking-[0.4px] uppercase">
              {stepLabel}
            </p>

            <h2 className="flex flex-col gap-2 text-center text-2xl font-semibold">
              {heading}

              {isLegacySetupResume && orgDisplayName ? (
                <p className="text-muted-foreground text-center text-sm font-normal">
                  {orgDisplayName}
                </p>
              ) : null}
            </h2>

            {isLegacySetupResume && needsPaymentOnly ? (
              <p className="text-muted-foreground text-center text-sm">
                Add a payment method to continue using your organization.
              </p>
            ) : null}

            <OrgBillingSetupForm
              stripePublishableKey={stripePublishableKey}
              contactDefaults={contactDefaults}
              initialSetup={initialSetup}
              initialContactInfo={initialContactInfo}
              partialOrgId={partialOrgId}
              submitLabel={submitLabel}
              onComplete={async ({ orgId, accountName, contactInfo }) => {
                if (isLegacySetupResume) {
                  const result = await completeLegacySetupMutation.mutateAsync({
                    orgId,
                    billingAccountName: accountName,
                    contactInfo,
                  });

                  if (result.projectId) {
                    navigate(
                      getPathWithParams(paths.project.detail.root, { projectId: result.projectId }),
                      { replace: true }
                    );
                    return;
                  }

                  navigate(getPathWithParams(paths.org.detail.projects.root, { orgId }), {
                    replace: true,
                  });
                  return;
                }

                const { projectId } = await setupProjectMutation.mutateAsync({
                  orgId,
                  billingAccountName: accountName,
                  contactInfo,
                });

                navigate(paths.onboarding.provisioning, {
                  replace: false,
                  state: {
                    orgName: orgDisplayNameFromContact(contactInfo),
                    projectId,
                  },
                });
              }}
            />
          </CardContent>
        </Card>
      </OnboardingEntrance>
    </div>
  );
};
