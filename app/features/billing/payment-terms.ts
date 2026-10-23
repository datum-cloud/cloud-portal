/**
 * Projection helpers for payment terms: the customer's applications for
 * them (`BillingArrangementApplication`) and the terms staff granted, which
 * billing publishes on `BillingAccount.status.paymentArrangement`.
 *
 * Customers can't read `BillingArrangement` or `BillingArrangementDecline`
 * themselves; everything they need is copied onto the application's status
 * and the billing account's status.
 */
import type { BillingAccount, BillingArrangementApplication } from './types';

export type ApplicationSpec = NonNullable<BillingArrangementApplication['spec']>;
export type ApplicationPhase = NonNullable<
  NonNullable<BillingArrangementApplication['status']>['phase']
>;
export type ApplicationPaymentOption = ApplicationSpec['paymentOption'];
export type ApplicantOrganizationType = ApplicationSpec['organization']['type'];
export type EstimatedMonthlySpend = NonNullable<
  ApplicationSpec['invoice']
>['estimatedMonthlySpend'];

export const PAYMENT_OPTION_LABELS: Record<ApplicationPaymentOption, string> = {
  Invoice: 'Pay by invoice',
  NotSure: 'Not sure',
};

export const ORGANIZATION_TYPE_LABELS: Record<ApplicantOrganizationType, string> = {
  Company: 'Company',
  PartnerOrReseller: 'Partner or reseller',
  Nonprofit: 'Nonprofit',
  EducationOrResearch: 'Education or research',
  Other: 'Other',
};

/** Bounds of each spend band, in whole units of the account's currency. */
const ESTIMATED_SPEND_BANDS: Record<EstimatedMonthlySpend, [number, number] | [number] | null> = {
  Under500: [500],
  From500To2500: [500, 2500],
  From2500To10000: [2500, 10000],
  Over10000: [10000],
  NotSure: null,
};

/** Spend bands in the order the form lists them. */
export const ESTIMATED_SPEND_OPTIONS: EstimatedMonthlySpend[] = [
  'Under500',
  'From500To2500',
  'From2500To10000',
  'Over10000',
  'NotSure',
];

/** Format a decimal amount string (e.g. "10000") in the account's currency. */
export function formatCurrencyAmount(amount: string | number, currency = 'USD'): string {
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    // An unknown currency code: show the number with the code after it.
    return `${value.toLocaleString('en-US')} ${currency}`;
  }
}

/** "Under $500", "$500–$2,500", "Over $10,000" or "Not sure yet". */
export function estimatedSpendLabel(spend: EstimatedMonthlySpend, currency = 'USD'): string {
  const band = ESTIMATED_SPEND_BANDS[spend];
  if (!band) return 'Not sure yet';
  if (spend === 'Under500') return `Under ${formatCurrencyAmount(band[0], currency)}`;
  if (band.length === 1) return `Over ${formatCurrencyAmount(band[0], currency)}`;
  return `${formatCurrencyAmount(band[0], currency)}–${formatCurrencyAmount(band[1], currency)}`;
}

/**
 * The phase to show for an application. Billing's controller derives the
 * phase from the staff decision and `spec.withdrawn`; its status can lag a
 * moment behind a create or a withdrawal, so fill that gap the same way
 * billing does: a decision wins, then a withdrawal, otherwise pending.
 */
export function applicationPhase(app: BillingArrangementApplication): ApplicationPhase {
  const phase = app.status?.phase;
  if (phase === 'Approved' || phase === 'Declined') return phase;
  return app.spec?.withdrawn ? 'Withdrawn' : 'Pending';
}

/** The billing account's most recent application, ignoring ones being deleted. */
export function latestApplication(
  applications: BillingArrangementApplication[],
  billingAccountName: string | undefined
): BillingArrangementApplication | undefined {
  if (!billingAccountName) return undefined;
  return applications
    .filter(
      (app) =>
        app.spec?.billingAccountRef.name === billingAccountName && !app.metadata?.deletionTimestamp
    )
    .sort((a, b) => {
      const byTime =
        Date.parse(b.metadata?.creationTimestamp ?? '') -
        Date.parse(a.metadata?.creationTimestamp ?? '');
      if (byTime !== 0 && !Number.isNaN(byTime)) return byTime;
      return (b.metadata?.name ?? '').localeCompare(a.metadata?.name ?? '');
    })[0];
}

function ordinal(day: number): string {
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** "Monthly, on the 1st". */
export function billingCycleLabel(account: BillingAccount | undefined): string {
  const terms = account?.spec?.paymentTerms;
  const frequency = terms?.invoiceFrequency ?? 'Monthly';
  const day = terms?.invoiceDayOfMonth ?? 1;
  return `${frequency}, on the ${ordinal(day)}`;
}

/**
 * The active payment terms on a billing account, ready to render.
 *
 * The credit limit staff set is left out on purpose: nothing enforces it or
 * alerts on it yet, so showing customers a "limit" would mislead them.
 */
export interface PaymentTermsSummary {
  /** Name of the BillingArrangement in effect. */
  name: string;
  netDays: number;
  /** Accounts payable email first, then the account's invoice recipients. */
  invoiceRecipients: string[];
  purchaseOrderNumber?: string;
  billingCycle: string;
  startsAt?: string;
  endsAt?: string;
}

/**
 * The invoice terms in effect on the account, from
 * `status.paymentArrangement`, or undefined when there are none.
 */
export function paymentTermsSummary(
  account: BillingAccount | undefined
): PaymentTermsSummary | undefined {
  const arrangement = account?.status?.paymentArrangement;
  const invoice = arrangement?.invoice;
  if (!arrangement || arrangement.type !== 'Invoice' || !invoice) return undefined;

  const contact = account.spec?.contactInfo;
  const accountRecipients = contact?.invoiceEmails?.length
    ? contact.invoiceEmails
    : contact?.email
      ? [contact.email]
      : [];
  const invoiceRecipients = [
    ...new Set([invoice.accountsPayableEmail, ...accountRecipients].filter(Boolean) as string[]),
  ];

  return {
    name: arrangement.name,
    netDays: invoice.netDays ?? 30,
    invoiceRecipients,
    purchaseOrderNumber: invoice.purchaseOrderNumber || undefined,
    billingCycle: billingCycleLabel(account),
    startsAt: arrangement.startsAt,
    endsAt: arrangement.endsAt,
  };
}

/** "2 October 2026". */
export function formatLongDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
