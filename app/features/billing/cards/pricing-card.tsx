import { DateTime } from '@/components/date-time';
import { formatDiscountPercentage } from '@/features/billing/discounts';
import type {
  FeePrice,
  PriceBand,
  PriceItem,
  PriceRate,
  UsagePrice,
} from '@/features/billing/pricing';
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
import { SearchIcon } from 'lucide-react';
import { Fragment, useState, type ReactNode } from 'react';

// Line the first/last cells up with the card padding, as the other billing
// tables do.
const ROW_INSET =
  '[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5';

const HEADER_DIVIDERS = '[&_th:not(:last-child)]:border-r [&_th]:border-border';

/** How many prices a long list shows before "Show all", with search above it. */
const ITEMS_SHOWN = 8;

/** A fee's end date. Contract dates are midnight UTC, so they're shown in UTC. */
function UtcDate({ date }: { date: string }) {
  return (
    <DateTime date={date} variant="absolute" format="MMMM d, yyyy" timezone="UTC" tooltip={false} />
  );
}

function Discount({ percentage }: { percentage: number }) {
  if (percentage <= 0) return <Text textColor="muted">—</Text>;
  return <>{formatDiscountPercentage(percentage)} off</>;
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <Text as="span" size="xs" textColor="muted">
      {children}
    </Text>
  );
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
      {rate.match ? <Muted>{rate.match}</Muted> : null}
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

function UsageCells({ price }: { price: UsagePrice }) {
  return (
    <>
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
    </>
  );
}

function FeeCells({ fee }: { fee: FeePrice }) {
  return (
    <>
      <TableCell className="py-3 align-top text-sm whitespace-normal">
        <div className="flex flex-col">
          <span>{fee.label}</span>
          {fee.details.map((detail, index) => (
            <Muted key={detail}>
              {detail}
              {/* The end date belongs with how long the fee runs. */}
              {fee.endsAt && index === fee.details.length - 1 ? (
                <>
                  , until <UtcDate date={fee.endsAt} />
                </>
              ) : null}
            </Muted>
          ))}
        </div>
      </TableCell>
      <TableCell className="py-3 align-top whitespace-normal">
        <div className="flex flex-col">
          <Text as="span" size="sm">
            {fee.amount}
          </Text>
          {fee.timing ? <Muted>{fee.timing}</Muted> : null}
        </div>
      </TableCell>
    </>
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

export interface PricingCardProps {
  items: PriceItem[];
  /** Where the account's usage this period can be seen. */
  usageLink?: ReactNode;
}

/**
 * Billing's "Pricing" section: one list of everything the account is charged
 * for, whether a contract fee, a plan fee or a usage rate, with each one's
 * discount. A long list can be searched and shows its first prices with the
 * rest a click away. Read-only; staff set prices.
 */
export const PricingCard = ({ items, usageLink }: PricingCardProps) => {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const query = search.trim().toLowerCase();
  const matching = query ? items.filter((item) => item.label.toLowerCase().includes(query)) : items;
  const shown = showAll || query ? matching : matching.slice(0, ITEMS_SHOWN);
  const long = items.length > ITEMS_SHOWN;

  const shared = sharedDiscount(items);
  // A column only when discounts differ from row to row.
  const showDiscount = shared === undefined && items.some((item) => item.discountPercentage > 0);

  return (
    <Card size="sm" sectioned className="overflow-hidden" data-e2e="pricing-card">
      <CardContent padding="none">
        {long ? (
          // Part of the table: a slim toolbar above its headers.
          <div className="bg-background flex items-center justify-between gap-3 border-b px-5 py-2">
            <div className="relative w-full sm:w-64">
              <Icon
                icon={SearchIcon}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search prices"
                aria-label="Search prices"
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Text as="span" size="xs" textColor="muted" className="shrink-0">
              {query ? `${matching.length} of ${items.length} prices` : `${items.length} prices`}
            </Text>
          </div>
        ) : null}
        <Table className={cn(ROW_INSET, HEADER_DIVIDERS)} data-e2e="pricing-list">
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="text-foreground w-[40%] text-xs font-medium">Item</TableHead>
              <TableHead className="text-foreground text-xs font-medium">Price</TableHead>
              {showDiscount ? (
                <TableHead className="text-foreground w-28 text-right text-xs font-medium">
                  Discount
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showDiscount ? 3 : 2}
                  className="text-muted-foreground h-11 text-center text-sm">
                  No prices match “{search.trim()}”.
                </TableCell>
              </TableRow>
            ) : null}
            {shown.map((item) => (
              <TableRow key={`${item.kind}-${item.name}`}>
                {item.kind === 'usage' ? <UsageCells price={item} /> : <FeeCells fee={item} />}
                {showDiscount ? (
                  <TableCell className="py-3 text-right align-top text-sm">
                    <Discount percentage={item.discountPercentage} />
                  </TableCell>
                ) : null}
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
              {showAll ? 'Show fewer' : `Show all ${items.length} prices`}
            </button>
          </div>
        ) : null}
      </CardContent>
      <CardFooter bordered className="text-muted-foreground bg-background py-3 text-xs">
        <span data-e2e="pricing-note">
          {shared !== undefined ? (
            <span className="text-foreground font-medium">
              {formatDiscountPercentage(shared)} discount on everything.{' '}
            </span>
          ) : null}
          Prices are before discounts and taxes.
          {usageLink ? <> {usageLink}</> : null}
        </span>
      </CardFooter>
    </Card>
  );
};
