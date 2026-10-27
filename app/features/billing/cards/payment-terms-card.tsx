import {
  PAYMENT_OPTION_LABELS,
  applicationPhase,
  estimatedSpendLabel,
  formatLongDate,
  type PaymentTermsSummary,
} from '@/features/billing/payment-terms';
import type { BillingArrangementApplication } from '@/features/billing/types';
import { paymentTermsPath } from '@/features/onboarding/payment-terms/payment-terms-paths';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { ReceiptTextIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** Terms ending within this many days get a renewal prompt. */
const ENDING_SOON_DAYS = 30;

const linkClassName = 'text-primary text-sm font-medium underline underline-offset-2';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Text as="span" size="xs" textColor="muted">
        {label}
      </Text>
      <Text as="span" size="sm" weight="medium" className="break-words">
        {children}
      </Text>
    </div>
  );
}

function endsWithinDays(endsAt: string | undefined, days: number): boolean {
  if (!endsAt) return false;
  const remaining = Date.parse(endsAt) - Date.now();
  return remaining > 0 && remaining <= days * 24 * 60 * 60 * 1000;
}

export interface PaymentTermsCardProps {
  orgId?: string;
  billingAccountName: string;
  /** Terms in effect on the account (`status.paymentArrangement`). */
  terms?: PaymentTermsSummary;
  /** The account's most recent application for payment terms. */
  application?: BillingArrangementApplication;
  currency: string;
  /**
   * Whether customers can apply (`PAYMENT_TERMS_ENABLED`). When false, terms
   * and existing applications still show, without a way to apply.
   */
  canApply?: boolean;
}

/**
 * Billing settings' "Payment terms" section: the invoice terms in effect,
 * an application under review, or a way to apply.
 */
export const PaymentTermsCard = ({
  orgId,
  billingAccountName,
  terms,
  application,
  currency,
  canApply = true,
}: PaymentTermsCardProps) => {
  const phase = application ? applicationPhase(application) : undefined;
  const applyPath = orgId
    ? paymentTermsPath({ orgId, billingAccountName, entry: 'settings' })
    : undefined;
  const applyAgainPath =
    orgId && canApply
      ? paymentTermsPath({ orgId, billingAccountName, entry: 'settings', apply: true })
      : undefined;

  if (terms) {
    const since = formatLongDate(terms.startsAt);
    const until = formatLongDate(terms.endsAt);
    const endingSoon = endsWithinDays(terms.endsAt, ENDING_SOON_DAYS);
    return (
      <Card size="sm" sectioned className="overflow-hidden" data-e2e="payment-terms-card">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
              <Icon icon={ReceiptTextIcon} className="text-primary size-4" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Text as="p" weight="semibold">
                Pay by invoice · Net {terms.netDays}
              </Text>
              <Text as="p" size="xs" textColor="muted">
                {[since && `Since ${since}`, until && `Valid until ${until}`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </div>
            <Badge type="success" theme="light" className="rounded-full">
              Active
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Detail label="Billing cycle">{terms.billingCycle}</Detail>
            <Detail label="Payment due">{terms.netDays} days after invoice</Detail>
            {terms.purchaseOrderNumber ? (
              <Detail label="Purchase order">{terms.purchaseOrderNumber}</Detail>
            ) : null}
            {terms.invoiceRecipients.length ? (
              <Detail label="Invoices sent to">{terms.invoiceRecipients.join(', ')}</Detail>
            ) : null}
            <Detail label="Pay by">Bank transfer, ACH or wire</Detail>
          </div>
        </CardContent>
        {endingSoon ? (
          <CardFooter bordered className="flex flex-wrap items-center justify-between gap-2">
            <Text as="p" size="sm">
              {applyAgainPath
                ? `These terms end on ${until}. Add a card or apply to renew to keep using Datum without interruption.`
                : `These terms end on ${until}. Add a card to keep using Datum without interruption.`}
            </Text>
            {applyAgainPath ? (
              <Link to={applyAgainPath} className={linkClassName}>
                Apply to renew
              </Link>
            ) : null}
          </CardFooter>
        ) : null}
      </Card>
    );
  }

  if (application && phase === 'Pending') {
    const invoice = application.spec?.invoice;
    const submitted = formatLongDate(application.metadata?.creationTimestamp);
    return (
      <Card size="sm" sectioned data-e2e="payment-terms-card">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <Text as="p" weight="semibold">
              Application under review
            </Text>
            <Badge type="warning" theme="light" className="rounded-full">
              {submitted ? `Submitted ${submitted}` : 'Under review'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {application.spec ? (
              <Detail label="Payment">
                {PAYMENT_OPTION_LABELS[application.spec.paymentOption]}
              </Detail>
            ) : null}
            {invoice ? (
              <>
                <Detail label="Estimated spend">
                  {estimatedSpendLabel(invoice.estimatedMonthlySpend, currency)} / month
                </Detail>
                <Detail label="Invoices to">{invoice.accountsPayableEmail}</Detail>
              </>
            ) : null}
          </div>
          <Text as="p" size="sm" textColor="muted">
            Our team usually reviews applications within one business day, and we&apos;ll email you
            when there&apos;s a decision.{' '}
            {applyPath ? (
              <Link to={applyPath} className={linkClassName}>
                View application
              </Link>
            ) : null}
          </Text>
        </CardContent>
      </Card>
    );
  }

  // Nothing to show and no way to apply.
  if (phase !== 'Declined' && !canApply) return null;

  return (
    <Card size="sm" sectioned data-e2e="payment-terms-card">
      <CardContent className="flex flex-col gap-2">
        {phase === 'Declined' ? (
          <Text as="p" size="sm">
            We couldn&apos;t approve your last application for payment terms.{' '}
            {applyPath ? (
              <Link to={applyPath} className={linkClassName}>
                See why
              </Link>
            ) : null}
          </Text>
        ) : (
          <Text as="p" size="sm">
            Want to pay by invoice?{' '}
            {applyPath ? (
              <Link to={applyPath} className={linkClassName} data-e2e="payment-terms-apply">
                Apply for payment terms
              </Link>
            ) : null}
          </Text>
        )}
      </CardContent>
    </Card>
  );
};
