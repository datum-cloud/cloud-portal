/**
 * Projection helpers for the prices a billing account is billed at.
 *
 * Customers can't read the account's Offer or its ServicePricings, so billing
 * copies every pricing in the Offer's published snapshot onto
 * `BillingAccount.status.prices`, as it copies discounts onto
 * `status.discounts` and the contract onto `status.contract`.
 */
import { formatCurrencyAmount } from './payment-terms';
import type { BillingAccount } from './types';

type StatusPrice = NonNullable<NonNullable<BillingAccount['status']>['prices']>[number];
type StatusRate = NonNullable<StatusPrice['rates']>[number];
type PriceInterval = NonNullable<StatusPrice['interval']>;

/** One band of a rate: "0 – 200 GB" → "Free", or the whole rate when flat. */
export interface PriceBand {
  /** "0 – 200 GB", "200 GB – 10 TB", "150 TB+"; unset for a flat rate. */
  range?: string;
  /** "$1.00 per million requests", "$0.00001400 per vCPU per second", or "Free". */
  price: string;
  /** The same rate per hour, for rates priced per second: "$0.0504 per vCPU per hour". */
  perHour?: string;
}

/** A rate, restricted to one dimension value when `match` is set. */
export interface PriceRate {
  /** "model: claude-sonnet-4-6"; unset when the rate applies to all usage. */
  match?: string;
  bands: PriceBand[];
}

/** A usage price, ready to render. */
export interface UsagePrice {
  name: string;
  label: string;
  serviceRef?: string;
  rates: PriceRate[];
  /** Whole-number percentage, 0 when there is no discount. */
  discountPercentage: number;
}

/** A fixed fee, ready to render. */
export interface FeePrice {
  name: string;
  label: string;
  chargeType: 'OneTime' | 'Recurring';
  /** "$2,400 / month", or "3 × $1,000 / month". */
  amount: string;
  discountPercentage: number;
}

export interface PricingSummary {
  usage: UsagePrice[];
  fees: FeePrice[];
}

const INTERVAL_SUFFIX: Record<PriceInterval, string> = {
  monthly: ' / month',
  quarterly: ' / quarter',
  annual: ' / year',
};

const UNIT_WORDS: Record<string, string> = {
  vcpu: 'vCPU',
  gib: 'GiB',
  gb: 'GB',
  mib: 'MiB',
  mb: 'MB',
  tib: 'TiB',
  tb: 'TB',
};

/** Data units and the unit 1,024 of them make, for tier ranges in TB. */
const LARGER_DATA_UNIT: Record<string, string> = { GB: 'TB', GiB: 'TiB', MB: 'GB', MiB: 'GiB' };

const TIME_UNITS = new Set(['second', 'minute', 'hour', 'day', 'month']);

/** "vcpu-second" → "vCPU-second", "gb" → "GB". */
export function formatPricingUnit(unit: string): string {
  return unit
    .split(/([-\s])/)
    .map((part) => UNIT_WORDS[part.toLowerCase()] ?? part)
    .join('');
}

/**
 * What a rate is per, split from the pricing unit: "vcpu-second" is a vCPU
 * per second, "GB" is data, "request" is a count of things.
 */
interface RateUnit {
  /** "vCPU", "GiB", "GB", "request"; empty when the pricing has no unit. */
  thing: string;
  /** "second" for "vcpu-second"; unset when usage isn't priced over time. */
  per?: string;
  /** Counted things (requests, tokens) read best per million. */
  counted: boolean;
}

function rateUnit(pricingUnit: string | undefined): RateUnit {
  const parts = formatPricingUnit(pricingUnit ?? '').split('-');
  const last = parts[parts.length - 1]?.toLowerCase() ?? '';
  const per = parts.length > 1 && TIME_UNITS.has(last) ? last : undefined;
  const thing = per ? parts.slice(0, -1).join('-') : parts.join('-');
  // Unit words like GB or vCPU are written in capitals; counted things aren't.
  const counted = !per && thing !== '' && thing === thing.toLowerCase();
  return { thing, per, counted };
}

function plural(word: string): string {
  return /s$/i.test(word) ? word : `${word}s`;
}

function formatMoney(value: number, currency: string, min: number, max: number): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }).format(value);
  } catch {
    return `${value.toLocaleString('en-US', { maximumFractionDigits: max })} ${currency}`;
  }
}

/**
 * A rate as the pricing page writes it: per million for tiny rates on counted
 * things ("$1.00 per million requests"), to eight places per second with the
 * hourly rate beside it ("$0.00001400 per vCPU per second", "$0.0504 per
 * vCPU per hour"), otherwise per unit ("$0.05 per GB").
 */
function formatRate(
  value: number,
  unit: RateUnit,
  currency: string
): Pick<PriceBand, 'price' | 'perHour'> {
  if (value === 0) return { price: 'Free' };

  if (unit.per === 'second') {
    const thing = unit.thing ? ` per ${unit.thing}` : '';
    return {
      price: `${formatMoney(value, currency, 8, 8)}${thing} per second`,
      perHour: `${formatMoney(value * 3600, currency, 2, 4)}${thing} per hour`,
    };
  }
  if (unit.per) {
    const thing = unit.thing ? ` per ${unit.thing}` : '';
    return { price: `${formatMoney(value, currency, 2, 6)}${thing} per ${unit.per}` };
  }
  if (unit.counted && value < 0.01) {
    return {
      price: `${formatMoney(value * 1_000_000, currency, 2, 4)} per million ${plural(unit.thing)}`,
    };
  }
  return {
    price: `${formatMoney(value, currency, 2, 6)}${unit.thing ? ` per ${unit.thing}` : ''}`,
  };
}

/** A tier boundary with its unit: 10,240 GB → "10" TB, 500,000 requests → "500K". */
function formatAmount(raw: string, unit: RateUnit): { n: string; unit: string } {
  const value = Number(raw);
  if (!Number.isFinite(value)) return { n: raw, unit: unit.thing };

  const larger = LARGER_DATA_UNIT[unit.thing];
  if (larger && value >= 1024 && value % 1024 === 0) {
    return { n: (value / 1024).toLocaleString('en-US'), unit: larger };
  }
  if (unit.counted) {
    const things = plural(unit.thing);
    for (const [size, suffix] of [
      [1_000_000_000, 'B'],
      [1_000_000, 'M'],
      [1_000, 'K'],
    ] as const) {
      if (value >= size && value % (size / 10) === 0) {
        return { n: `${(value / size).toLocaleString('en-US')}${suffix}`, unit: things };
      }
    }
    return { n: value.toLocaleString('en-US'), unit: things };
  }
  return { n: value.toLocaleString('en-US'), unit: unit.thing };
}

function withUnit(amount: { n: string; unit: string }): string {
  return amount.unit ? `${amount.n} ${amount.unit}` : amount.n;
}

/** "0 – 200 GB", "200 GB – 10 TB", "10 – 150 TB", "150 TB+". */
function tierRange(from: string | undefined, upTo: string | undefined, unit: RateUnit): string {
  if (upTo === undefined) {
    return from === undefined ? 'All usage' : `${withUnit(formatAmount(from, unit))}+`;
  }
  const end = formatAmount(upTo, unit);
  const start = formatAmount(from ?? '0', unit);
  // Only write the unit once when both ends share it.
  return start.unit === end.unit || from === undefined
    ? `${start.n} – ${withUnit(end)}`
    : `${withUnit(start)} – ${withUnit(end)}`;
}

function rateBands(rate: StatusRate, unit: RateUnit, currency: string): PriceBand[] {
  if (rate.tiered?.length) {
    let from: string | undefined;
    return rate.tiered.map((tier) => {
      const band = {
        range: tierRange(from, tier.upTo, unit),
        ...formatRate(Number(tier.rate), unit, currency),
      };
      from = tier.upTo;
      return band;
    });
  }
  return [formatRate(Number(rate.flat ?? 0), unit, currency)];
}

function usagePrice(price: StatusPrice): UsagePrice {
  const unit = rateUnit(price.pricingUnit);
  const rates = price.rates ?? [];
  const matched = rates.some((r) => r.match);
  const priced = rates.map((rate) => ({
    // Billing applies the first matching rate, so a rate without a match
    // after matched ones covers everything else.
    match: rate.match
      ? `${rate.match.dimension}: ${rate.match.value}`
      : matched
        ? 'Everything else'
        : undefined,
    bands: rateBands(rate, unit, price.currency),
  }));
  // Rates that differ only by dimension but cost the same read as one price.
  const first = priced[0];
  const uniform =
    first !== undefined &&
    priced.every((r) => JSON.stringify(r.bands) === JSON.stringify(first.bands));
  return {
    name: price.name,
    label: price.displayName || price.name,
    serviceRef: price.serviceRef,
    rates: uniform && priced.length > 1 ? [{ bands: first.bands }] : priced,
    discountPercentage: price.discountPercentage ?? 0,
  };
}

function feePrice(price: StatusPrice): FeePrice {
  const chargeType = price.chargeType === 'OneTime' ? 'OneTime' : 'Recurring';
  const amount = formatCurrencyAmount(price.amount ?? '0', price.currency);
  const quantity = price.quantity && price.quantity > 1 ? `${price.quantity} × ` : '';
  const interval = chargeType === 'Recurring' ? INTERVAL_SUFFIX[price.interval ?? 'monthly'] : '';
  return {
    name: price.name,
    label: price.displayName || price.name,
    chargeType,
    amount: `${quantity}${amount}${interval}`,
    discountPercentage: price.discountPercentage ?? 0,
  };
}

/**
 * The prices billing publishes on the account, or undefined when it publishes
 * none (no published Offer yet, or a billing release that predates
 * `status.prices`). Usage prices are sorted by service then label, so a
 * service's meters sit together; fees keep billing's order.
 *
 * `excludeFees` leaves out fees already shown elsewhere, such as the
 * contract's.
 */
export function pricingSummary(
  account: BillingAccount | undefined,
  { excludeFees }: { excludeFees?: ReadonlySet<string> } = {}
): PricingSummary | undefined {
  const prices = account?.status?.prices;
  if (!prices?.length) return undefined;

  const usage = prices
    .filter((p) => p.chargeType === 'Usage')
    .map(usagePrice)
    .sort(
      (a, b) =>
        (a.serviceRef ?? '').localeCompare(b.serviceRef ?? '') || a.label.localeCompare(b.label)
    );
  const fees = prices
    .filter((p) => p.chargeType !== 'Usage' && !excludeFees?.has(p.name))
    .map(feePrice);

  return { usage, fees };
}
