import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import type { ContractSummary } from '@/features/billing/contract';
import { ordinal } from '@/features/billing/payment-terms';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
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
import { FileSignatureIcon } from 'lucide-react';
import type { ReactNode } from 'react';

// Line the first/last cells up with the card padding, as the other billing
// tables do.
const ROW_INSET =
  '[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5';

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
 * under, its fixed fees and whether usage is billed on top. Read-only; staff
 * set contracts up, so changes go through support.
 */
export const ContractCard = ({ contract }: ContractCardProps) => {
  const { started, startsAt, billingDayOfMonth, fees, usageBilled } = contract;

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
              {fees.map((fee) => (
                <TableRow key={fee.name}>
                  <TableCell className="h-11 text-sm">
                    {fee.quantity ? (
                      <div className="flex flex-col py-1.5">
                        <span>{fee.label}</span>
                        <Text as="span" size="xs" textColor="muted">
                          {fee.quantity}
                        </Text>
                      </div>
                    ) : (
                      fee.label
                    )}
                  </TableCell>
                  <TableCell className="h-11 text-sm">
                    {CHARGE_TYPE_LABELS[fee.chargeType]}
                  </TableCell>
                  <TableCell className="h-11 text-right text-sm">{fee.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      ) : null}
      <CardFooter bordered className="text-muted-foreground bg-background py-3 text-xs">
        {started
          ? 'Fees are shown before discounts. To change your contract, contact support.'
          : 'One-time fees are charged when the contract starts. Fees are shown before discounts.'}
      </CardFooter>
    </Card>
  );
};
