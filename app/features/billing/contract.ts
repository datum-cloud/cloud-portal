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
  /**
   * For a contract billed on the account's invoice day, when its first
   * period, charged in part, ends, while that's still to come. Unset when
   * every period is whole.
   */
  proratedUntil?: string;
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

/** `months` months after an invoice day, on the same day (1 to 28), in UTC. */
function addMonthsUtc(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

/**
 * The first date on or after `date` that a fee charged every `months` months
 * bills on, for a contract billed on the invoice day `invoiceDay`: that day
 * of every month, of January, April, July and October, or of January, as
 * billing counts periods.
 */
export function nextInvoiceDayBilling(date: Date, invoiceDay: number, months = 1): Date {
  let billing = new Date(Date.UTC(date.getUTCFullYear(), 0, invoiceDay));
  while (billing > date) billing = new Date(Date.UTC(billing.getUTCFullYear() - 1, 0, invoiceDay));
  while (billing < date) {
    billing = new Date(
      Date.UTC(billing.getUTCFullYear(), billing.getUTCMonth() + months, invoiceDay)
    );
  }
  return billing;
}

/** Whether billing bills the contract on the account's invoice day, not its start's. */
function billsOnInvoiceDay(contract: StatusContract): boolean {
  return contract.billingDay === 'InvoiceDay';
}

/**
 * The contract's invoices from its start through the next `months` months,
 * worked out from its fees the way they're billed: one-time fees on the
 * start date; a recurring fee billed in advance at the start of each of its
 * periods, and one billed in arrears at the end; a fee with renewals
 * stopping after its last period; and usage at the end of every month. All
 * fall on the contract's billing day, and are due the account's net days
 * after. A contract billed on the account's invoice day follows
 * invoiceDaySchedule instead.
 */
export function contractInvoiceSchedule(
  contract: StatusContract,
  netDays: number | undefined,
  months = 12
): ScheduledInvoice[] {
  if (billsOnInvoiceDay(contract)) return invoiceDaySchedule(contract, netDays, months);
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

/** A recurring fee's periods on a contract billed on the invoice day. */
function invoiceDayPeriods(
  fee: StatusContractFee,
  startsAt: Date,
  invoiceDay: number,
  until: number
): { from: Date; to: Date; share: number }[] {
  const every = INTERVAL_MONTHS[fee.interval ?? 'monthly'];
  const first = nextInvoiceDayBilling(startsAt, invoiceDay, every);
  const periods: { from: Date; to: Date; share: number }[] = [];
  if (first > startsAt) {
    const whole = first.getTime() - addMonthsUtc(first, -every).getTime();
    periods.push({
      from: startsAt,
      to: first,
      share: (first.getTime() - startsAt.getTime()) / whole,
    });
  }
  // A fee with renewals runs that many whole periods after the prorated one.
  for (let i = 0; !fee.periods || i < fee.periods; i++) {
    const from = addMonthsUtc(first, i * every);
    if (from.getTime() > until) break;
    periods.push({ from, to: addMonthsUtc(first, (i + 1) * every), share: 1 });
  }
  return periods;
}

/**
 * contractInvoiceSchedule for a contract billed on the account's invoice day
 * (billingDayOfMonth): invoiced when it starts, then on each invoice day. A
 * recurring fee's first period runs from the start to its first billing date
 * (the next invoice day, or for a quarterly or annual fee the next one in
 * January, April, July or October, or in January) and is charged in part;
 * its renewals are whole periods from there.
 */
function invoiceDaySchedule(
  contract: StatusContract,
  netDays: number | undefined,
  months: number
): ScheduledInvoice[] {
  const startsAt = new Date(contract.startsAt);
  const invoiceDay = contract.billingDayOfMonth;
  const fees = contract.fees ?? [];
  const currency = fees[0]?.currency ?? 'USD';

  const first = nextInvoiceDayBilling(startsAt, invoiceDay);
  const dates = [startsAt];
  for (let k = first > startsAt ? 0 : 1; dates.length <= months; k++) {
    dates.push(addMonthsUtc(first, k));
  }
  const horizon = dates[dates.length - 1].getTime();
  const byDate = new Map<number, ScheduledCharge[]>(dates.map((date) => [date.getTime(), []]));
  const add = (date: Date, charge: ScheduledCharge) => {
    if (date.getTime() <= horizon) byDate.get(date.getTime())?.push(charge);
  };

  for (const fee of fees) {
    const label = fee.displayName || fee.name;
    if (fee.chargeType === 'OneTime') {
      add(startsAt, { label, total: feeTotal(fee) });
      continue;
    }
    const inAdvance = feeTiming(fee) === 'InAdvance';
    for (const period of invoiceDayPeriods(fee, startsAt, invoiceDay, horizon)) {
      add(inAdvance ? period.from : period.to, {
        label,
        total: Math.round(feeTotal(fee) * period.share * 100) / 100,
      });
    }
  }

  return dates.flatMap((date, k): ScheduledInvoice[] => {
    const charges = byDate.get(date.getTime()) ?? [];
    const usage = (contract.usageBilled ?? false) && k > 0;
    if (charges.length === 0 && !usage) return [];
    const total = Math.round(charges.reduce((sum, c) => sum + c.total, 0) * 100) / 100;
    return [
      {
        date: date.toISOString(),
        ...(netDays !== undefined
          ? { dueDate: new Date(date.getTime() + netDays * DAY_MS).toISOString() }
          : {}),
        charges,
        total: formatCurrencyAmount(total, currency),
        billsUsage: usage,
      },
    ];
  });
}

/**
 * When a contract billed on the invoice day finishes the first period it's
 * charged in part for: the latest of its recurring fees' first billing
 * dates, or undefined when it bills on its start day, or starts on all of
 * them.
 */
function proratedUntil(contract: StatusContract): Date | undefined {
  if (!billsOnInvoiceDay(contract)) return undefined;
  const startsAt = new Date(contract.startsAt);
  const ends = (contract.fees ?? [])
    .filter((fee) => fee.chargeType === 'Recurring')
    .map((fee) =>
      nextInvoiceDayBilling(
        startsAt,
        contract.billingDayOfMonth,
        INTERVAL_MONTHS[fee.interval ?? 'monthly']
      )
    )
    .filter((end) => end > startsAt);
  return ends.length > 0 ? new Date(Math.max(...ends.map((end) => end.getTime()))) : undefined;
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
  const prorated = proratedUntil(contract);

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
    ...(prorated && prorated.getTime() > now ? { proratedUntil: prorated.toISOString() } : {}),
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
