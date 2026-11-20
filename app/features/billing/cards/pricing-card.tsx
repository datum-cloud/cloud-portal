import { formatDiscountPercentage } from '@/features/billing/discounts';
import type {
  FeePrice,
  PriceBand,
  PriceRate,
  PricingSummary,
  UsagePrice,
} from '@/features/billing/pricing';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
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
import { Fragment, type ReactNode } from 'react';

// Line the first/last cells up with the card padding, as the other billing
// tables do.
const ROW_INSET =
  '[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5';

const HEADER_DIVIDERS = '[&_th:not(:last-child)]:border-r [&_th]:border-border';

const CHARGE_TYPE_LABELS: Record<FeePrice['chargeType'], string> = {
  OneTime: 'One-time',
  Recurring: 'Recurring',
};

function Discount({ percentage }: { percentage: number }) {
  if (percentage <= 0) return <Text textColor="muted">—</Text>;
  return <>{formatDiscountPercentage(percentage)} off</>;
}

function BandPrice({ band }: { band: PriceBand }) {
  return (
    <span className="flex flex-col">
      <Text as="span" size="sm">
        {band.price}
      </Text>
      {band.perHour ? (
        <Text as="span" size="sm" textColor="muted">
          {band.perHour}
        </Text>
      ) : null}
    </span>
  );
}

function Rate({ rate }: { rate: PriceRate }) {
  const tiered = rate.bands.some((band) => band.range);
  return (
    <div className="flex flex-col gap-0.5">
      {rate.match ? (
        <Text as="span" size="xs" textColor="muted">
          {rate.match}
        </Text>
      ) : null}
      {tiered ? (
        // Ranges in one column and prices in the next, as the pricing page
        // lays tiers out.
        <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-x-4 gap-y-0.5">
          {rate.bands.map((band, index) => (
            <Fragment key={index}>
              <Text as="span" size="sm" textColor="muted">
                {band.range}
              </Text>
              <BandPrice band={band} />
            </Fragment>
          ))}
        </div>
      ) : (
        rate.bands.map((band, index) => <BandPrice key={index} band={band} />)
      )}
    </div>
  );
}

/**
 * The discount every item shares, when they all have the same one above 0%,
 * so it can be said once instead of on every row.
 */
function sharedDiscount(items: ReadonlyArray<{ discountPercentage: number }>): number | undefined {
  const first = items[0]?.discountPercentage;
  if (!first || first <= 0) return undefined;
  return items.every((item) => item.discountPercentage === first) ? first : undefined;
}

function UsageRow({ price, showDiscount }: { price: UsagePrice; showDiscount: boolean }) {
  return (
    <TableRow>
      <TableCell className="py-3 align-top text-sm">{price.label}</TableCell>
      <TableCell className="py-3 align-top whitespace-normal">
        <div className="flex flex-col gap-2">
          {price.rates.length === 0 ? (
            <Text as="span" size="sm" textColor="muted">
              Not priced
            </Text>
          ) : (
            price.rates.map((rate, index) => <Rate key={index} rate={rate} />)
          )}
        </div>
      </TableCell>
      {showDiscount ? (
        <TableCell className="py-3 text-right align-top text-sm">
          <Discount percentage={price.discountPercentage} />
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function PriceTable({
  columns,
  children,
  'data-e2e': dataE2e,
}: {
  columns: Array<{ label: string; className?: string }>;
  children: ReactNode;
  'data-e2e'?: string;
}) {
  return (
    <Table className={cn(ROW_INSET, HEADER_DIVIDERS)} data-e2e={dataE2e}>
      <TableHeader>
        <TableRow className="bg-background hover:bg-background">
          {columns.map((column) => (
            <TableHead
              key={column.label}
              className={cn('text-foreground text-xs font-medium', column.className)}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

export interface PricingCardProps {
  pricing: PricingSummary;
  /** Where the account's usage this period can be seen. */
  usageLink?: ReactNode;
}

/**
 * Billing's "Pricing" section: every usage rate and fixed fee the account is
 * billed at, with each one's discount. Read-only; prices come from the
 * account's plan, which staff set.
 */
export const PricingCard = ({ pricing, usageLink }: PricingCardProps) => {
  const { usage, fees } = pricing;
  const usageShared = sharedDiscount(usage);
  const feesShared = sharedDiscount(fees);
  // A column only when discounts differ from row to row.
  const usageDiscounted = usageShared === undefined && usage.some((p) => p.discountPercentage > 0);
  const feesDiscounted = feesShared === undefined && fees.some((p) => p.discountPercentage > 0);
  const everythingShared =
    usageShared !== undefined &&
    (fees.length === 0 || feesShared === usageShared) &&
    (usage.length > 0 || fees.length > 0);
  const discountNotes = everythingShared
    ? [`${formatDiscountPercentage(usageShared)} discount on everything.`]
    : [
        usageShared !== undefined
          ? `${formatDiscountPercentage(usageShared)} discount on all usage.`
          : undefined,
        feesShared !== undefined
          ? `${formatDiscountPercentage(feesShared)} discount on all fees.`
          : undefined,
      ].filter((note): note is string => note !== undefined);

  return (
    <Card size="sm" sectioned className="overflow-hidden" data-e2e="pricing-card">
      {usage.length > 0 ? (
        <CardContent padding="none">
          <PriceTable
            data-e2e="pricing-usage"
            columns={[
              { label: 'Usage', className: 'w-[40%]' },
              { label: 'Price' },
              ...(usageDiscounted ? [{ label: 'Discount', className: 'w-28 text-right' }] : []),
            ]}>
            {usage.map((price) => (
              <UsageRow key={price.name} price={price} showDiscount={usageDiscounted} />
            ))}
          </PriceTable>
        </CardContent>
      ) : null}
      {fees.length > 0 ? (
        <CardContent padding="none">
          <PriceTable
            data-e2e="pricing-fees"
            columns={[
              { label: 'Fee', className: 'w-[40%]' },
              { label: 'Type', className: 'w-32' },
              { label: 'Amount', className: 'text-right' },
              ...(feesDiscounted ? [{ label: 'Discount', className: 'w-28 text-right' }] : []),
            ]}>
            {fees.map((fee) => (
              <TableRow key={fee.name}>
                <TableCell className="h-11 text-sm">{fee.label}</TableCell>
                <TableCell className="h-11 text-sm">{CHARGE_TYPE_LABELS[fee.chargeType]}</TableCell>
                <TableCell className="h-11 text-right text-sm">{fee.amount}</TableCell>
                {feesDiscounted ? (
                  <TableCell className="h-11 text-right text-sm">
                    <Discount percentage={fee.discountPercentage} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </PriceTable>
        </CardContent>
      ) : null}
      {usage.length === 0 && fees.length === 0 ? (
        <CardContent>
          <Text as="p" size="sm" textColor="muted">
            Your plan has no charges.
          </Text>
        </CardContent>
      ) : null}
      <CardFooter bordered className="text-muted-foreground bg-background py-3 text-xs">
        <span data-e2e="pricing-note">
          {discountNotes.map((note) => (
            <span key={note} className="text-foreground font-medium">
              {note}{' '}
            </span>
          ))}
          Prices are before discounts and taxes.
          {usageLink ? <> {usageLink}</> : null}
        </span>
      </CardFooter>
    </Card>
  );
};
