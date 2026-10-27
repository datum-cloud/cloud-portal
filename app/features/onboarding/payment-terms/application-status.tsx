import {
  billingSettingsPath,
  cardSetupPath,
  isNewOrgEntry,
  paymentTermsPath,
  type PaymentTermsEntry,
} from './payment-terms-paths';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { formatLongDate, type PaymentTermsSummary } from '@/features/billing/payment-terms';
import { useCompleteLegacyOrgSetup } from '@/features/onboarding/billing/use-setup-onboarding-project';
import { onboardingCardClassName } from '@/features/onboarding/onboarding-layout';
import type { OrgContactInfoValues } from '@/features/onboarding/schemas/org-contact-info-schema';
import { useWithdrawBillingArrangementApplication } from '@/resources/billing-arrangement-applications';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { openSupportMessage } from '@/utils/open-support-message';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CircleCheckIcon, CircleXIcon, HourglassIcon } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link, useNavigate, useRevalidator } from 'react-router';

/** How often the review page checks for a decision. */
const REVIEW_POLL_MS = 10_000;

/** What the customer sent, as shown on the review and declined pages. */
export interface ApplicationSummary {
  name: string;
  paymentOptionLabel: string;
  estimatedSpendLabel?: string;
  accountsPayableEmail?: string;
  purchaseOrderNumber?: string;
  submittedAt?: string;
  declineMessage?: string;
}

interface StatusContext {
  orgId: string;
  billingAccountName: string;
  orgDisplayName: string;
  entry: PaymentTermsEntry;
  applicant: { firstName?: string; email?: string };
}

// The same card as the rest of onboarding. The route sets the width.
const cardClassName = cn(onboardingCardClassName, 'w-full');

function StatusIcon({
  icon,
  tone,
}: {
  icon: typeof HourglassIcon;
  tone: 'neutral' | 'success' | 'danger';
}) {
  return (
    <div
      className={cn(
        'mx-auto flex size-12 items-center justify-center rounded-full',
        tone === 'neutral' && 'bg-muted text-primary',
        tone === 'success' && 'bg-card-success text-[#4D6A49]',
        tone === 'danger' && 'bg-destructive/10 text-destructive'
      )}
      aria-hidden>
      <Icon icon={icon} className="size-5" />
    </div>
  );
}

function DetailsTable({
  title,
  rows,
  tone = 'neutral',
}: {
  title: string;
  rows: Array<[string, ReactNode]>;
  tone?: 'neutral' | 'success';
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border',
        tone === 'success' && 'bg-card-success/40 border-[#86A182]'
      )}>
      <Text as="p" size="sm" weight="medium" className="border-b px-4 py-2.5">
        {title}
      </Text>
      <dl className="divide-y">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5">
            <dt>
              <Text as="span" size="sm" textColor="muted">
                {label}
              </Text>
            </dt>
            <dd className="text-right break-all">
              <Text as="span" size="sm">
                {value}
              </Text>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FooterLinks({ entry }: { entry: PaymentTermsEntry }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-sm"
        onClick={() => openSupportMessage({ subject: 'My payment terms application' })}>
        Contact support
      </button>
      {entry === 'settings' ? null : (
        <Link
          to={paths.auth.logOut}
          className="text-muted-foreground hover:text-foreground text-sm">
          Log out
        </Link>
      )}
    </div>
  );
}

function sentRows(application: ApplicationSummary): Array<[string, ReactNode]> {
  const rows: Array<[string, ReactNode]> = [['Payment', application.paymentOptionLabel]];
  if (application.estimatedSpendLabel) {
    rows.push(['Estimated spend', `${application.estimatedSpendLabel} / month`]);
  }
  if (application.accountsPayableEmail)
    rows.push(['Invoices to', application.accountsPayableEmail]);
  if (application.purchaseOrderNumber)
    rows.push(['Purchase order', application.purchaseOrderNumber]);
  return rows;
}

/** Screen 3: the holding page while staff review the application. */
export function ApplicationUnderReview({
  context,
  application,
}: {
  context: StatusContext;
  application: ApplicationSummary;
}) {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const { confirm } = useConfirmationDialog();
  const withdraw = useWithdrawBillingArrangementApplication();
  const fromSettings = context.entry === 'settings';

  // Check for a decision by re-running the loader, which shows the approved
  // or declined page once staff decide. Onboarding pages sit outside the
  // private layout, so there's no watch connection to lean on here.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && revalidator.state === 'idle') {
        revalidator.revalidate();
      }
    }, REVIEW_POLL_MS);
    return () => clearInterval(interval);
  }, [revalidator]);

  const handleWithdraw = () =>
    confirm({
      title: 'Withdraw your application?',
      description: fromSettings
        ? 'Your application will be withdrawn. You can apply again later from billing settings.'
        : 'Your application will be withdrawn so you can add a card instead. You can apply again later from billing settings.',
      submitText: 'Withdraw',
      cancelText: 'Keep my application',
      variant: 'destructive',
      onSubmit: async () => {
        try {
          await withdraw.mutateAsync({ orgId: context.orgId, name: application.name });
        } catch (error) {
          toast.error('Payment terms', {
            description:
              error instanceof Error ? error.message : "We couldn't withdraw your application",
          });
          throw error;
        }
        navigate(
          fromSettings
            ? billingSettingsPath(context.billingAccountName)
            : cardSetupPath({ orgId: context.orgId, entry: context.entry }),
          { replace: true }
        );
      },
    });

  const nextSteps = [
    "We review your application. If we need anything else, we'll email you.",
    fromSettings
      ? "When it's approved, you'll see your terms in billing settings."
      : isNewOrgEntry(context.entry)
        ? "When it's approved, you'll go straight on to create your first project."
        : "When it's approved, you'll go straight back into your organization.",
    'Your first invoice arrives at the end of your first billing cycle.',
  ];
  const submitted = formatLongDate(application.submittedAt);

  return (
    <Card className={cardClassName} data-e2e="payment-terms-under-review">
      <CardContent className="flex flex-col gap-6 p-0">
        <div className="flex flex-col gap-3 text-center">
          <StatusIcon icon={HourglassIcon} tone="neutral" />
          <Title as="h1" level={4} weight="medium">
            We&apos;re reviewing your application
          </Title>
          <Text as="p" className="leading-5">
            {context.applicant.firstName ? `Thanks, ${context.applicant.firstName}. ` : 'Thanks. '}
            Our team is reviewing your application for payment terms for{' '}
            <strong>{context.orgDisplayName}</strong>. Most applications are reviewed within one
            business day, and we&apos;ll email you
            {context.applicant.email ? (
              <>
                {' '}
                at <strong>{context.applicant.email}</strong>
              </>
            ) : null}{' '}
            as soon as there&apos;s a decision.
          </Text>
          <div>
            <Badge type="warning" theme="light" className="rounded-full">
              Under review{submitted ? ` · Submitted ${submitted}` : ''}
            </Badge>
          </div>
        </div>

        <DetailsTable title="What you sent" rows={sentRows(application)} />

        <div className="flex flex-col gap-3">
          <Text as="p" size="sm" weight="medium">
            What happens next
          </Text>
          <ol className="flex flex-col gap-3">
            {nextSteps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <Text
                  as="span"
                  size="xs"
                  className="bg-muted flex size-5 shrink-0 items-center justify-center rounded-full">
                  {index + 1}
                </Text>
                <Text as="span" size="sm">
                  {step}
                </Text>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-3">
          {fromSettings ? (
            <LinkButton
              as={Link}
              href={billingSettingsPath(context.billingAccountName)}
              type="primary"
              theme="solid"
              className="w-full">
              Back to billing
            </LinkButton>
          ) : null}
          <Button
            htmlType="button"
            type="secondary"
            theme="outline"
            className="w-full"
            loading={withdraw.isPending}
            onClick={handleWithdraw}
            data-e2e="payment-terms-withdraw">
            {fromSettings ? 'Withdraw application' : 'Add a card instead'}
          </Button>
          <FooterLinks entry={context.entry} />
        </div>
      </CardContent>
    </Card>
  );
}

/** Screen 4: the application was approved and the terms are in effect. */
export function ApplicationApproved({
  context,
  terms,
  contactInfo,
}: {
  context: StatusContext;
  /** Undefined until billing publishes the terms (for example, terms starting later). */
  terms?: PaymentTermsSummary;
  /** Needed to finish the org's setup (contact info and first project). */
  contactInfo?: OrgContactInfoValues;
}) {
  const navigate = useNavigate();
  const completeSetup = useCompleteLegacyOrgSetup();
  const fromSettings = context.entry === 'settings';

  const handleContinue = async () => {
    const orgProjects = getPathWithParams(paths.org.detail.projects.root, { orgId: context.orgId });
    if (!contactInfo) {
      navigate(orgProjects, { replace: true });
      return;
    }
    try {
      // Same finish as the card path: save the contact details on the org,
      // and create the first project if the org has none.
      const result = await completeSetup.mutateAsync({
        orgId: context.orgId,
        billingAccountName: context.billingAccountName,
        contactInfo,
      });
      navigate(
        result.projectId
          ? getPathWithParams(paths.project.detail.root, { projectId: result.projectId })
          : orgProjects,
        { replace: true }
      );
    } catch (error) {
      toast.error('Organization setup', {
        description:
          error instanceof Error
            ? error.message
            : "We couldn't finish setting up your organization",
      });
    }
  };

  const rows: Array<[string, ReactNode]> = terms
    ? [
        ['Payment', `Invoice, due in ${terms.netDays} days`],
        ['Billing cycle', terms.billingCycle],
        ...(terms.invoiceRecipients.length
          ? ([['Invoices to', terms.invoiceRecipients.join(', ')]] as Array<[string, ReactNode]>)
          : []),
        ...(terms.purchaseOrderNumber
          ? ([['Purchase order', terms.purchaseOrderNumber]] as Array<[string, ReactNode]>)
          : []),
      ]
    : [];

  return (
    <Card className={cardClassName} data-e2e="payment-terms-approved">
      <CardContent className="flex flex-col gap-6 p-0">
        <div className="flex flex-col gap-3 text-center">
          <StatusIcon icon={CircleCheckIcon} tone="success" />
          <Title as="h1" level={4} weight="medium">
            You&apos;re approved
          </Title>
          <Text as="p" className="leading-5">
            {context.orgDisplayName} can now pay by invoice
            {terms ? ` on net ${terms.netDays} terms` : ''}.
            {context.applicant.email
              ? ` We've emailed ${context.applicant.email} with the details.`
              : ''}
          </Text>
        </div>

        {terms ? (
          <DetailsTable title="Your payment terms" rows={rows} tone="success" />
        ) : (
          <Text as="p" size="sm" textColor="muted" className="text-center">
            Your terms will appear in billing settings once they take effect.
          </Text>
        )}

        <Text as="p" size="xs" textColor="muted" className="text-center">
          You can see these terms any time in billing settings.
        </Text>

        <div className="flex flex-col gap-3">
          {fromSettings ? (
            <LinkButton
              as={Link}
              href={billingSettingsPath(context.billingAccountName)}
              type="primary"
              theme="solid"
              className="w-full">
              Back to billing
            </LinkButton>
          ) : (
            <Button
              htmlType="button"
              type="primary"
              className="w-full"
              loading={completeSetup.isPending}
              onClick={handleContinue}
              data-e2e="payment-terms-continue">
              {isNewOrgEntry(context.entry) ? 'Create your first project' : 'Continue'}
            </Button>
          )}
          <FooterLinks entry={context.entry} />
        </div>
      </CardContent>
    </Card>
  );
}

/** Screen 5: staff declined the application, with a message for the customer. */
export function ApplicationDeclined({
  context,
  application,
  canApplyAgain = true,
}: {
  context: StatusContext;
  application: ApplicationSummary;
  /** False while applying is turned off (`PAYMENT_TERMS_ENABLED`). */
  canApplyAgain?: boolean;
}) {
  const fromSettings = context.entry === 'settings';
  return (
    <Card className={cardClassName} data-e2e="payment-terms-declined">
      <CardContent className="flex flex-col gap-6 p-0">
        <div className="flex flex-col gap-3 text-center">
          <StatusIcon icon={CircleXIcon} tone="danger" />
          <Title as="h1" level={4} weight="medium">
            We couldn&apos;t approve your application
          </Title>
          <Text as="p" className="leading-5">
            We&apos;ve reviewed your application for payment terms for {context.orgDisplayName} and
            aren&apos;t able to approve it right now.
          </Text>
        </div>

        {application.declineMessage ? (
          <div className="bg-muted/50 border-primary rounded-lg border-l-2 px-4 py-3">
            <Text as="p" size="xs" weight="medium" textColor="muted" className="mb-1">
              Message from the Datum team
            </Text>
            <Text as="p" size="sm" className="whitespace-pre-line">
              {application.declineMessage}
            </Text>
          </div>
        ) : null}

        <Text as="p" className="text-center leading-5">
          {fromSettings
            ? canApplyAgain
              ? 'You can keep paying by card, or apply again with more information.'
              : 'You can keep paying by card.'
            : canApplyAgain
              ? 'You can add a card to get started now, or apply again with more information.'
              : 'You can add a card to get started now.'}
        </Text>

        <div className="flex flex-col gap-3">
          <LinkButton
            as={Link}
            href={cardSetupPath({
              orgId: context.orgId,
              entry: context.entry,
              billingAccountName: context.billingAccountName,
            })}
            type="primary"
            theme="solid"
            className="w-full">
            {fromSettings ? 'Back to billing' : 'Add a card'}
          </LinkButton>
          {canApplyAgain ? (
            <LinkButton
              as={Link}
              href={paymentTermsPath({
                orgId: context.orgId,
                billingAccountName: context.billingAccountName,
                entry: context.entry,
                apply: true,
              })}
              type="secondary"
              theme="outline"
              className="w-full"
              data-e2e="payment-terms-apply-again">
              Apply again
            </LinkButton>
          ) : null}
          <FooterLinks entry={context.entry} />
        </div>
      </CardContent>
    </Card>
  );
}
