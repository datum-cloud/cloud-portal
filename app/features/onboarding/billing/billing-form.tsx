import { ProfileIdentity } from '@/components/profile-identity';
import {
  useCompleteLegacyOrgSetup,
  useSetupOnboardingProject,
} from '@/features/onboarding/billing/use-setup-onboarding-project';
import { BillingLegacyResumeNotice } from '@/features/onboarding/components/billing-legacy-resume-notice';
import { OnboardingEntrance } from '@/features/onboarding/components/onboarding-entrance';
import { onboardingCardClassName } from '@/features/onboarding/onboarding-layout';
import {
  orgDisplayNameFromContact,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { OrgBillingSetupForm } from '@/features/organization/billing/org-billing-setup-form';
import { logger } from '@/modules/logger';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useEffect, useRef } from 'react';
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
  /** Existing active card on the account, so resume shows it as already added. */
  initialPayment?: { brand?: string | null; last4: string };
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
  initialPayment,
  partialOrgId,
  needsPaymentOnly = false,
}: BillingFormProps) => {
  const navigate = useNavigate();
  const { trackAction } = useAnalytics();
  const projectKickoffRef = useRef<string | null>(null);

  const completeLegacySetupMutation = useCompleteLegacyOrgSetup({
    onError: (error) => {
      toast.error('Billing setup', {
        description: error.message ?? 'Failed to finish organization billing setup',
      });
    },
  });

  // New-user onboarding only: start default project + billing bind as soon as
  // org + billing account exist so IAM can propagate during payment entry.
  // Idempotent — provisioning joins the same in-flight work.
  const setupProjectMutation = useSetupOnboardingProject({
    onError: (error) => {
      logger.warn('Background onboarding project setup failed; provisioning will retry', {
        error: error.message,
      });
    },
  });
  const { mutate: startProjectSetup } = setupProjectMutation;

  const kickOffDefaultProject = (input: {
    orgId: string;
    billingAccountName: string;
    contactInfo: OrgContactInfoValues;
  }) => {
    if (isLegacySetupResume) return;
    if (projectKickoffRef.current === input.orgId) return;
    projectKickoffRef.current = input.orgId;
    startProjectSetup(input);
  };

  useEffect(() => {
    if (!initialSetup || !initialContactInfo || isLegacySetupResume) return;
    if (projectKickoffRef.current === initialSetup.orgId) return;
    projectKickoffRef.current = initialSetup.orgId;
    startProjectSetup({
      orgId: initialSetup.orgId,
      billingAccountName: initialSetup.accountName,
      contactInfo: initialContactInfo,
    });
  }, [initialContactInfo, initialSetup, isLegacySetupResume, startProjectSetup]);

  // Legacy resume always has an org — either a full prior setup or a partial one.
  const resumeOrgId = initialSetup?.orgId ?? partialOrgId;

  const stepLabel = isLegacySetupResume ? 'Billing setup' : 'Step 2 / 2';
  const heading = isLegacySetupResume ? 'Complete organization setup' : 'Payment Verification';
  const submitLabel = isLegacySetupResume ? 'Continue' : 'Start free';

  return (
    <div
      className={cn(
        'z-10 flex w-full min-w-0 flex-col items-stretch gap-5',
        isLegacySetupResume && 'mx-auto md:flex-row md:items-stretch md:justify-center'
      )}>
      <OnboardingEntrance
        className={cn(
          'flex w-full min-w-0 md:max-w-[410px]',
          isLegacySetupResume && 'md:self-stretch',
          !isLegacySetupResume && 'mx-auto'
        )}>
        <Card
          className={cn(
            onboardingCardClassName,
            'flex h-full flex-col',
            // Extra vertical space is shared top/bottom so form content
            // stays centered when the notice card sets the row height.
            isLegacySetupResume && 'md:justify-center'
          )}>
          <CardContent className="flex flex-col gap-8 p-0">
            <p className="text-muted-foreground text-1xs text-center tracking-[0.4px] uppercase">
              {stepLabel}
            </p>

            <div className="flex flex-col items-center gap-3">
              <h2 className="text-center text-2xl font-semibold">{heading}</h2>

              {isLegacySetupResume && orgDisplayName ? (
                <div className="border-border bg-muted/50 flex max-w-full items-center gap-2 rounded-full border py-1 pr-3 pl-1">
                  <ProfileIdentity
                    avatarOnly
                    name={orgDisplayName}
                    size="xs"
                    className="size-6 rounded-full"
                    fallbackClassName="rounded-full text-[10px]"
                  />
                  <span className="text-foreground truncate text-sm font-medium">
                    {orgDisplayName}
                  </span>
                </div>
              ) : null}
            </div>

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
              initialPaymentSummary={initialPayment}
              partialOrgId={partialOrgId}
              submitLabel={submitLabel}
              onOrgProvisioned={({ orgId, accountName, contactInfo }) => {
                trackAction(AnalyticsAction.ContactDetailsSaved, { orgId });
                kickOffDefaultProject({
                  orgId,
                  billingAccountName: accountName,
                  contactInfo,
                });
              }}
              onComplete={async ({ orgId, accountName, contactInfo }) => {
                trackAction(AnalyticsAction.PaymentDetailsSaved, { orgId });

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

                const setupInput = {
                  orgId,
                  billingAccountName: accountName,
                  contactInfo,
                };

                navigate(paths.onboarding.provisioning, {
                  replace: false,
                  state: {
                    orgName: orgDisplayNameFromContact(contactInfo),
                    setup: setupInput,
                  },
                });
              }}
            />
          </CardContent>
        </Card>
      </OnboardingEntrance>

      {isLegacySetupResume && resumeOrgId ? (
        <BillingLegacyResumeNotice orgId={resumeOrgId} orgDisplayName={orgDisplayName} />
      ) : null}
    </div>
  );
};
