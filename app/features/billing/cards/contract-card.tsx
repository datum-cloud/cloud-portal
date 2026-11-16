import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { chargeNames, type ContractSummary } from '@/features/billing/contract';
import { ordinal } from '@/features/billing/payment-terms';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Input } from '@datum-cloud/datum-ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { FileSignatureIcon, SearchIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

// Line the first/last cells up with the card padding, as the other billing
// tables do.
const ROW_INSET =
  '[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5';

/** How many fees a contract shows before "Show all". */
const FEES_SHOWN = 5;

const HEADER_DIVIDERS = '[&_th:not(:last-child)]:border-r [&_th]:border-border';

const CHARGE_TYPE_LABELS: Record<ContractSummary['fees'][number]['chargeType'], string> = {
  OneTime: 'One-time',
  Recurring: 'Recurring',
};

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
 * Billing settings' "Contract" section: the contract the account is billed
 * under, its fixed fees (how often each is charged, whether in advance or in
 * arrears, and for how long), whether usage is billed on top, and the
 * invoices coming up. Read-only; staff set contracts up, so changes go
 * through support.
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
  // A long contract shows its first fees, with the rest a click away, and
  // can be searched by name.
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const query = search.trim().toLowerCase();
  const matching = query ? fees.filter((fee) => fee.label.toLowerCase().includes(query)) : fees;
  const shownFees = showAll || query ? matching : matching.slice(0, FEES_SHOWN);
  const long = fees.length > FEES_SHOWN;

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
          <Detail label="Usage">
            {usageBilled ? 'Billed on top of your fees' : 'No usage charges'}
          </Detail>
        </div>
      </CardContent>
      {fees.length > 0 ? (
        <CardContent padding="none">
          {long ? (
            // Part of the table: a slim toolbar above its headers.
            <div className="bg-background flex items-center justify-between gap-3 border-y px-5 py-2">
              <div className="relative w-full sm:w-64">
                <Icon
                  icon={SearchIcon}
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search fees"
                  aria-label="Search fees"
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Text as="span" size="xs" textColor="muted" className="shrink-0">
                {query ? `${matching.length} of ${fees.length} fees` : `${fees.length} fees`}
              </Text>
            </div>
          ) : null}
          <Table className={cn(ROW_INSET, HEADER_DIVIDERS)} data-e2e="contract-fees">
            <TableHeader>
              <TableRow className="bg-background hover:bg-background">
                <TableHead className="text-foreground text-xs font-medium">Fee</TableHead>
                <TableHead className="text-foreground w-32 text-xs font-medium">Type</TableHead>
                <TableHead className="text-foreground w-40 text-right text-xs font-medium">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shownFees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground h-11 text-center text-sm">
                    No fees match “{search.trim()}”.
                  </TableCell>
                </TableRow>
              ) : null}
              {shownFees.map((fee) => (
                <TableRow key={fee.name}>
                  <TableCell className="h-11 text-sm">
                    <div className="flex flex-col py-1.5">
                      <span>{fee.label}</span>
                      {fee.quantity ? (
                        <Text as="span" size="xs" textColor="muted">
                          {fee.quantity}
                        </Text>
                      ) : null}
                      {fee.renewals ? (
                        <Text as="span" size="xs" textColor="muted">
                          {fee.renewals}
                          {fee.endsAt ? (
                            <>
                              , until <ContractDate date={fee.endsAt} />
                            </>
                          ) : null}
                        </Text>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="h-11 text-sm">
                    <div className="flex flex-col py-1.5">
                      <span>{fee.frequency ?? CHARGE_TYPE_LABELS[fee.chargeType]}</span>
                      {fee.billing ? (
                        <Text as="span" size="xs" textColor="muted">
                          {fee.billing}
                        </Text>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="h-11 text-right text-sm">{fee.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {long && !query ? (
            <div className="border-t px-5 py-3">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4 transition-colors"
                onClick={() => setShowAll((value) => !value)}>
                {showAll ? 'Show fewer' : `Show all ${fees.length} fees`}
              </button>
            </div>
          ) : null}
        </CardContent>
      ) : null}
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
          ? 'Fees are shown before discounts. To change your contract, contact support.'
          : 'One-time fees, and fees billed in advance, are charged when the contract starts. Fees are shown before discounts.'}
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
