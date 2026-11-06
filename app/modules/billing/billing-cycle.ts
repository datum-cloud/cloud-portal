import { format } from 'date-fns';

export type InvoiceFrequency = 'Monthly' | 'Quarterly' | 'Annual';

export interface PaymentTermsInput {
  invoiceDayOfMonth?: number;
  invoiceFrequency?: InvoiceFrequency;
}

export interface BillingCycleWindow {
  value: 'current' | 'previous';
  label: string;
  startSec: number;
  endSec: number;
}

/**
 * What a billing account's cycles need from it: its payment terms and the
 * contract billing publishes on its status.
 */
export interface BillingCycleAccount {
  spec?: { paymentTerms?: PaymentTermsInput };
  status?: { contract?: { startsAt: string; billingDayOfMonth: number } };
}

const FREQUENCY_MONTHS: Record<InvoiceFrequency, number> = {
  Monthly: 1,
  Quarterly: 3,
  Annual: 12,
};

/**
 * The terms an account's billing cycles follow: its payment terms, except
 * that a contract that has started bills monthly on its own day. Mirrors
 * billing's `usagereport.CycleTerms`, so the portal, Patch and `datumctl
 * billing` agree on cycles.
 */
export function cycleTerms(
  account: BillingCycleAccount | null | undefined,
  now = new Date()
): PaymentTermsInput | undefined {
  const terms = account?.spec?.paymentTerms;
  const contract = account?.status?.contract;
  if (!contract) return terms;
  const startsAt = Date.parse(contract.startsAt);
  if (Number.isNaN(startsAt) || now.getTime() < startsAt) return terms;
  return { ...terms, invoiceFrequency: 'Monthly', invoiceDayOfMonth: contract.billingDayOfMonth };
}

/**
 * The invoice day in a month, clamped to the month's length: payment terms
 * allow days 1–28, but a contract can bill on the 29th to 31st.
 */
function anchorDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

/**
 * Move `months` months from `date` and re-anchor on `day`, so a cycle on the
 * 31st that was clamped to 28 Feb lands on 31 Mar, not 28 Mar.
 */
function addMonthsOnDay(date: Date, months: number, day: number): Date {
  return anchorDate(date.getUTCFullYear(), date.getUTCMonth() + months, day);
}

/** Latest cycle start at or before `ref`, anchored on `invoiceDay`. */
function cycleStartAtOrBefore(ref: Date, invoiceDay: number, periodMonths: number): Date {
  let start = anchorDate(ref.getUTCFullYear(), ref.getUTCMonth(), invoiceDay);

  while (start > ref) {
    start = addMonthsOnDay(start, -periodMonths, invoiceDay);
  }
  while (addMonthsOnDay(start, periodMonths, invoiceDay) <= ref) {
    start = addMonthsOnDay(start, periodMonths, invoiceDay);
  }

  return start;
}

function formatCycleRange(start: Date, end: Date): string {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = format(start, 'd MMM');
  const endLabel = sameYear ? format(end, 'd MMM yyyy') : format(end, 'd MMM yyyy');
  return `${startLabel} - ${endLabel}`;
}

/**
 * Build current + previous billing windows from the terms an account's
 * cycles follow (see `cycleTerms`). Labels mirror the Figma copy; query
 * bounds cap the current cycle at "now" so in-progress periods don't include
 * future time.
 */
export function buildBillingCycleWindows(
  terms: PaymentTermsInput | undefined,
  now = new Date()
): BillingCycleWindow[] {
  const invoiceDay = terms?.invoiceDayOfMonth ?? 1;
  const periodMonths = FREQUENCY_MONTHS[terms?.invoiceFrequency ?? 'Monthly'];

  const currentStart = cycleStartAtOrBefore(now, invoiceDay, periodMonths);
  const currentEndBoundary = addMonthsOnDay(currentStart, periodMonths, invoiceDay);
  const previousStart = addMonthsOnDay(currentStart, -periodMonths, invoiceDay);

  const currentQueryEnd = new Date(Math.min(currentEndBoundary.getTime(), now.getTime()));

  return [
    {
      value: 'current',
      label: `Current billing cycle (${formatCycleRange(currentStart, currentEndBoundary)})`,
      startSec: Math.floor(currentStart.getTime() / 1000),
      endSec: Math.floor(currentQueryEnd.getTime() / 1000),
    },
    {
      value: 'previous',
      label: `Previous billing cycle (${formatCycleRange(previousStart, currentStart)})`,
      startSec: Math.floor(previousStart.getTime() / 1000),
      endSec: Math.floor(currentStart.getTime() / 1000),
    },
  ];
}

export function selectBillingCycleWindow(
  windows: BillingCycleWindow[],
  cycle: string | null | undefined
): BillingCycleWindow {
  return windows.find((window) => window.value === cycle) ?? windows[0];
}
