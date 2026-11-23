import { DateTime } from '@/components/date-time';
import type { BillingPeriodSummary } from '@/features/billing/billing-period';
import { chargeNames } from '@/features/billing/contract';
import { SpendValue } from '@/features/usage/components/spend-value';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Text } from '@datum-cloud/datum-ui/typography';
import type { ReactNode } from 'react';

/**
 * Billing periods start and end at midnight UTC, so their dates are shown in
 * UTC: in the user's timezone they could read as the day before.
 */
function PeriodDate({ date, withYear = true }: { date: string; withYear?: boolean }) {
  return (
    <DateTime
      date={date}
      variant="absolute"
      format={withYear ? 'MMM d, yyyy' : 'MMM d'}
      timezone="UTC"
      tooltip={false}
    />
  );
}

/** The period's last day: it ends at midnight before the next one starts. */
function lastDay(end: string): string {
  return new Date(Date.parse(end) - 24 * 60 * 60 * 1000).toISOString();
}

export interface CurrentPeriodCardProps {
  period: BillingPeriodSummary;
  spend?: UsageSpend;
  /** The spend couldn't be worked out for this period. */
  spendUnavailable?: boolean;
  spendLoading?: boolean;
  /** Link to the usage page, for what makes up the spend. */
  usageLink?: ReactNode;
}

/**
 * The billing overview's "This period": what the account has spent so far
 * and the invoice that's coming next.
 */
export const CurrentPeriodCard = ({
  period,
  spend,
  spendUnavailable,
  spendLoading,
  usageLink,
}: CurrentPeriodCardProps) => {
  const { nextInvoice } = period;
  const sameYear =
    new Date(period.start).getUTCFullYear() === new Date(lastDay(period.end)).getUTCFullYear();

  return (
    <Card size="sm" sectioned className="overflow-hidden" data-e2e="current-period-card">
      <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1" data-e2e="current-period-spend">
          <Text as="span" size="xs" textColor="muted">
            Spend this period
          </Text>
          {/* Headline figures: a step above the cards' 14px values, but
              under the section heading's weight. */}
          <Text as="span" size="lg" weight="medium">
            {spendLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <SpendValue
                spend={spend}
                unavailable={spendUnavailable}
                className="text-lg font-medium"
              />
            )}
          </Text>
          <Text as="span" size="xs" textColor="muted">
            <PeriodDate date={period.start} withYear={!sameYear} />
            {' – '}
            <PeriodDate date={lastDay(period.end)} />
          </Text>
        </div>
        <div className="flex min-w-0 flex-col gap-1" data-e2e="current-period-next-invoice">
          <Text as="span" size="xs" textColor="muted">
            Next invoice
          </Text>
          <Text as="span" size="lg" weight="medium">
            <PeriodDate date={nextInvoice.date} />
          </Text>
          <Text as="span" size="sm" weight="medium" className="tabular-nums">
            {nextInvoice.total
              ? `${nextInvoice.total}${nextInvoice.billsUsage ? ' plus usage' : ''}`
              : "This period's usage"}
          </Text>
          {nextInvoice.charges.length > 0 ? (
            // However many fees are on it, one line: the first two and how
            // many more, with the full list on hover.
            <Text
              as="span"
              size="xs"
              textColor="muted"
              className="truncate"
              title={nextInvoice.charges.map((charge) => charge.label).join(', ')}>
              {chargeNames(nextInvoice.charges)}
            </Text>
          ) : null}
          {nextInvoice.dueDate ? (
            <Text as="span" size="xs" textColor="muted">
              Due <PeriodDate date={nextInvoice.dueDate} />
            </Text>
          ) : null}
        </div>
      </CardContent>
      <CardFooter bordered className="text-muted-foreground bg-background py-3 text-xs">
        <span>
          Spend is this period&apos;s usage so far, before discounts and tax. The next invoice is an
          estimate. {usageLink}
        </span>
      </CardFooter>
    </Card>
  );
};
