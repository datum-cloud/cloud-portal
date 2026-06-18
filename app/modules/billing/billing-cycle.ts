import { addMonths, format } from 'date-fns';

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

const FREQUENCY_MONTHS: Record<InvoiceFrequency, number> = {
  Monthly: 1,
  Quarterly: 3,
  Annual: 12,
};

/** Clamp the invoice anchor day to the month's length (API allows 1–28). */
function anchorDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

function addPeriod(start: Date, frequency: InvoiceFrequency): Date {
  return addMonths(start, FREQUENCY_MONTHS[frequency]);
}

function subtractPeriod(start: Date, frequency: InvoiceFrequency): Date {
  return addMonths(start, -FREQUENCY_MONTHS[frequency]);
}

/** Latest cycle start at or before `ref`, anchored on `invoiceDay`. */
function cycleStartAtOrBefore(ref: Date, invoiceDay: number, frequency: InvoiceFrequency): Date {
  const periodMonths = FREQUENCY_MONTHS[frequency];
  let start = anchorDate(ref.getUTCFullYear(), ref.getUTCMonth(), invoiceDay);

  while (start > ref) {
    start = addMonths(start, -periodMonths);
  }
  while (addMonths(start, periodMonths) <= ref) {
    start = addMonths(start, periodMonths);
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
 * Build current + previous billing windows from a billing account's
 * `spec.paymentTerms`. Labels mirror the Figma copy; query bounds cap the
 * current cycle at "now" so in-progress periods don't include future time.
 */
export function buildBillingCycleWindows(
  terms: PaymentTermsInput | undefined,
  now = new Date()
): BillingCycleWindow[] {
  const invoiceDay = terms?.invoiceDayOfMonth ?? 1;
  const frequency = terms?.invoiceFrequency ?? 'Monthly';

  const currentStart = cycleStartAtOrBefore(now, invoiceDay, frequency);
  const currentEndBoundary = addPeriod(currentStart, frequency);
  const previousStart = subtractPeriod(currentStart, frequency);

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
