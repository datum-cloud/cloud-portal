import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { chargeNames, type ContractSummary } from '@/features/billing/contract';
import { ordinal } from '@/features/billing/payment-terms';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { FileSignatureIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The contract's start day. Contracts start at midnight UTC, so it's shown in
 * UTC: in the user's timezone it could read as the day before.
 */
function ContractDate({ date }: { date: string }) {
  return (
    <DateTime date={date} variant="absolute" format="MMMM d, yyyy" timezone="UTC" tooltip={false} />
  );
}

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

export interface ContractCardProps {
  contract: ContractSummary;
}

/**
 * Billing settings' "Contract" section: the contract's terms (when it
 * started, the day it bills, whether usage is billed on top) and the invoices
 * coming up. Its fees are listed with every other price in the Pricing
 * section. Read-only; staff set contracts up, so changes go through support.
 */
export const ContractCard = ({ contract }: ContractCardProps) => {
  const {
    started,
    startsAt,
    billingDayOfMonth,
    fees,
    usageBilled,
    upcomingInvoices,
    hasFeesInArrears,
  } = contract;

  return (
    <Card size="sm" sectioned className="overflow-hidden" data-e2e="contract-card">
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
            <Icon icon={FileSignatureIcon} className="text-primary size-4" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Text as="p" weight="semibold">
              Contract
            </Text>
            <Text as="p" size="xs" textColor="muted">
              {started ? 'Since' : 'Starts'} <ContractDate date={startsAt} />
            </Text>
          </div>
          {started ? (
            <BadgeStatus status="active" label="Active" />
          ) : (
            <BadgeStatus status="inactive" label="Upcoming" />
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Detail label="Billing cycle">Monthly, on the {ordinal(billingDayOfMonth)}</Detail>
          <Detail label="Fees">
            {fees.length === 0 ? 'None' : `${fees.length} ${fees.length === 1 ? 'fee' : 'fees'}`}
          </Detail>
          <Detail label="Usage">
            {usageBilled ? 'Billed on top of your fees' : 'No usage charges'}
          </Detail>
        </div>
      </CardContent>
      {upcomingInvoices.length > 0 ? (
        <CardContent className="flex flex-col gap-3" data-e2e="contract-upcoming-invoices">
          <Text as="p" size="sm" weight="medium">
            Upcoming invoices
          </Text>
          <ul className="flex flex-col gap-2.5">
            {upcomingInvoices.map((invoice) => (
              <li key={invoice.date} className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Text as="span" size="sm">
                    <ContractDate date={invoice.date} />
                  </Text>
                  {invoice.charges.length > 0 ? (
                    // However many fees are on it, one line: the first two
                    // and how many more, with the full list on hover.
                    <Text
                      as="span"
                      size="xs"
                      textColor="muted"
                      className="truncate"
                      title={invoice.charges.map((charge) => charge.label).join(', ')}>
                      {chargeNames(invoice.charges)}
                    </Text>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <Text as="span" size="sm" className="tabular-nums">
                    {invoice.charges.length === 0
                      ? 'Usage'
                      : invoice.billsUsage
                        ? `${invoice.total} plus usage`
                        : invoice.total}
                  </Text>
                  {invoice.dueDate ? (
                    <Text as="span" size="xs" textColor="muted">
                      Due <ContractDate date={invoice.dueDate} />
                    </Text>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
      <CardFooter bordered className="text-muted-foreground bg-background py-3 text-xs">
        {started
          ? "The contract's fees are listed with their prices under Pricing. To change your contract, contact support."
          : "One-time fees, and fees billed in advance, are charged when the contract starts. The contract's fees are listed under Pricing."}
        {hasFeesInArrears
          ? ' Fees billed in arrears are invoiced at the end of each period, with its usage.'
          : ''}
        {upcomingInvoices.length > 0
          ? ' Upcoming invoices are estimates, before discounts and tax.'
          : ''}
      </CardFooter>
    </Card>
  );
};
