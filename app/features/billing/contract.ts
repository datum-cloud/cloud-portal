/**
 * Projection helpers for the contract a billing account is billed under.
 *
 * Customers can't read the account's BillingEntitlement or its Offer, so
 * billing copies the contract and its fixed fees onto
 * `BillingAccount.status.contract`, as it copies discounts onto
 * `status.discounts`.
 */
import { formatCurrencyAmount } from './payment-terms';
import type { BillingAccount } from './types';

type StatusContract = NonNullable<NonNullable<BillingAccount['status']>['contract']>;
type StatusContractFee = NonNullable<StatusContract['fees']>[number];
type FeeInterval = NonNullable<StatusContractFee['interval']>;
type FeeBillingTiming = NonNullable<StatusContractFee['billingTiming']>;

export interface ContractFee {
  name: string;
  label: string;
  chargeType: StatusContractFee['chargeType'];
  /** What the fee charges, unit amount times quantity: "$5,000" or "$1,200 / month". */
  amount: string;
  /**
   * How the amount is made up, when it's more than one of something or has
   * a unit: "4 × $300 / port" or "3 × $8,000". Undefined for a single fee.
   */
  quantity?: string;
  /** How often a recurring fee is charged: "Every month", "Every quarter", "Every year". */
  frequency?: string;
  /** When a recurring fee is invoiced: "Billed in advance" or "Billed in arrears". */
  billing?: string;
  /** How long a fee with renewals runs: "For 36 months". */
  renewals?: string;
  /** When a fee with renewals stops, as billing published it. */
  endsAt?: string;
}

/** One fee's charge on an upcoming invoice. */
export interface ScheduledCharge {
  label: string;
  /** What it charges, before discounts. */
  total: number;
}

/** An invoice the contract will produce. */
export interface ScheduledInvoice {
  date: string;
  /** When it's due, from the account's payment terms. */
  dueDate?: string;
  charges: ScheduledCharge[];
  /** The fixed charges' total, formatted. */
  total: string;
  /** Whether usage is billed on it too. */
  billsUsage: boolean;
}

/** The account's contract, ready to render. */
export interface ContractSummary {
  startsAt: string;
  /** Whether the contract has started, as of `now`. */
  started: boolean;
  billingDayOfMonth: number;
  fees: ContractFee[];
  usageBilled: boolean;
  /**
   * The invoices still to come in the next year that are worth pointing
   * out: the next one, and any charging a one-time, quarterly or annual fee.
   */
  upcomingInvoices: ScheduledInvoice[];
  /** Whether any recurring fee is billed in arrears, at the end of its period. */
  hasFeesInArrears: boolean;
}

const INTERVAL_SUFFIX: Record<FeeInterval, string> = {
  monthly: ' / month',
  quarterly: ' / quarter',
  annual: ' / year',
};

const FREQUENCY: Record<FeeInterval, string> = {
  monthly: 'Every month',
  quarterly: 'Every quarter',
  annual: 'Every year',
};

const PERIOD_NAMES: Record<FeeInterval, [string, string]> = {
  monthly: ['month', 'months'],
  quarterly: ['quarter', 'quarters'],
  annual: ['year', 'years'],
};

const INTERVAL_MONTHS: Record<FeeInterval, number> = { monthly: 1, quarterly: 3, annual: 12 };

/** What a fee charges: its unit amount times its quantity, to the cent. */
function feeTotal(fee: StatusContractFee): number {
  const quantity = fee.quantity && fee.quantity > 0 ? fee.quantity : 1;
  return Math.round(Number(fee.amount) * quantity * 100) / 100;
}

/** How billing reads a recurring fee's timing: in advance unless it says otherwise. */
function feeTiming(fee: StatusContractFee): FeeBillingTiming {
  return fee.billingTiming ?? 'InAdvance';
}

/**
 * A fee as the customer is charged it. Billing publishes the unit amount and
 * how many the contract charges (1 when unset), so the total is worked out
 * here, to the cent, as billing charges it.
 */
function contractFee(fee: StatusContractFee): ContractFee {
  const recurring = fee.chargeType === 'Recurring';
  const interval: FeeInterval = fee.interval ?? 'monthly';
  const suffix = recurring ? INTERVAL_SUFFIX[interval] : '';
  const quantity = fee.quantity && fee.quantity > 0 ? fee.quantity : 1;
  const total = feeTotal(fee);
  const unitPrice = formatCurrencyAmount(fee.amount, fee.currency);
  const breakdown = fee.pricingUnit
    ? `${quantity} × ${unitPrice} / ${fee.pricingUnit}`
    : quantity > 1
      ? `${quantity} × ${unitPrice}`
      : undefined;
  const [one, many] = PERIOD_NAMES[interval];
  return {
    name: fee.name,
    label: fee.displayName || fee.name,
    chargeType: fee.chargeType,
    amount: `${formatCurrencyAmount(Number.isFinite(total) ? total : fee.amount, fee.currency)}${suffix}`,
    ...(breakdown ? { quantity: breakdown } : {}),
    ...(recurring
      ? {
          frequency: FREQUENCY[interval],
          billing: feeTiming(fee) === 'InArrears' ? 'Billed in arrears' : 'Billed in advance',
        }
      : {}),
    ...(recurring && fee.periods
      ? { renewals: `For ${fee.periods} ${fee.periods === 1 ? one : many}` }
      : {}),
    ...(recurring && fee.endsAt ? { endsAt: fee.endsAt } : {}),
  };
}

/**
 * The contract's billing date `months` months after it starts: the start's
 * day of the month, or the last day of a shorter month, in UTC.
 */
function billingDate(startsAt: Date, months: number): Date {
  const year = startsAt.getUTCFullYear();
  const month = startsAt.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(startsAt.getUTCDate(), lastDay)));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The contract's invoices from its start through the next `months` months,
 * worked out from its fees the way they're billed: one-time fees on the
 * start date; a recurring fee billed in advance at the start of each of its
 * periods, and one billed in arrears at the end; a fee with renewals
 * stopping after its last period; and usage at the end of every month. All
 * fall on the contract's billing day, and are due the account's net days
 * after.
 */
export function contractInvoiceSchedule(
  contract: StatusContract,
  netDays: number | undefined,
  months = 12
): ScheduledInvoice[] {
  const startsAt = new Date(contract.startsAt);
  const fees = contract.fees ?? [];
  const currency = fees[0]?.currency ?? 'USD';
  const invoices: ScheduledInvoice[] = [];
  for (let k = 0; k <= months; k++) {
    const date = billingDate(startsAt, k);
    const charges = fees.flatMap((fee): ScheduledCharge[] => {
      const charge = { label: fee.displayName || fee.name, total: feeTotal(fee) };
      if (fee.chargeType === 'OneTime') return k === 0 ? [charge] : [];
      const every = INTERVAL_MONTHS[fee.interval ?? 'monthly'];
      if (k % every !== 0) return [];
      const inAdvance = feeTiming(fee) === 'InAdvance';
      const last = fee.periods ? fee.periods * every : undefined;
      if (last !== undefined && (inAdvance ? k >= last : k > last)) return [];
      return inAdvance || k > 0 ? [charge] : [];
    });
    const usage = (contract.usageBilled ?? false) && k > 0;
    if (charges.length === 0 && !usage) continue;
    const total = Math.round(charges.reduce((sum, c) => sum + c.total, 0) * 100) / 100;
    invoices.push({
      date: date.toISOString(),
      ...(netDays !== undefined
        ? { dueDate: new Date(date.getTime() + netDays * DAY_MS).toISOString() }
        : {}),
      charges,
      total: formatCurrencyAmount(total, currency),
      billsUsage: usage,
    });
  }
  return invoices;
}

/**
 * The invoices to point out from a schedule: those dated after `now`, of
 * which the next, and any charging a one-time, quarterly or annual fee.
 */
function notableUpcoming(
  contract: StatusContract,
  schedule: ScheduledInvoice[],
  now: number,
  max = 4
): ScheduledInvoice[] {
  const longer = new Set(
    (contract.fees ?? [])
      .filter((fee) => fee.chargeType === 'OneTime' || (fee.interval && fee.interval !== 'monthly'))
      .map((fee) => fee.displayName || fee.name)
  );
  return schedule
    .filter((invoice) => Date.parse(invoice.date) > now)
    .filter(
      (invoice, index) => index === 0 || invoice.charges.some((charge) => longer.has(charge.label))
    )
    .slice(0, max);
}

/**
 * The contract billing publishes on the account, or undefined when there is
 * none. Fees keep billing's order (one-time fees first) and are before
 * discounts, which `status.discounts` lists.
 */
export function contractSummary(
  account: BillingAccount | undefined,
  now: number
): ContractSummary | undefined {
  const contract = account?.status?.contract;
  if (!contract) return undefined;
  const netDays =
    account?.status?.paymentArrangement?.invoice?.netDays ?? account?.spec?.paymentTerms?.netDays;

  return {
    startsAt: contract.startsAt,
    started: Date.parse(contract.startsAt) <= now,
    billingDayOfMonth: contract.billingDayOfMonth,
    fees: (contract.fees ?? []).map(contractFee),
    usageBilled: contract.usageBilled ?? false,
    upcomingInvoices: notableUpcoming(contract, contractInvoiceSchedule(contract, netDays), now),
    hasFeesInArrears: (contract.fees ?? []).some(
      (fee) => fee.chargeType === 'Recurring' && feeTiming(fee) === 'InArrears'
    ),
  };
}

/**
 * The fees on an invoice in a few words, however many there are: "Private
 * link", "Private link and Cross connect", or "Private link, Cross connect
 * and 3 more" past `shown` of them.
 */
export function chargeNames(charges: ScheduledCharge[], shown = 2): string {
  const names = charges.map((charge) => charge.label);
  if (names.length <= shown) {
    return names.length === 2 ? `${names[0]} and ${names[1]}` : names.join('');
  }
  return `${names.slice(0, shown).join(', ')} and ${names.length - shown} more`;
}
