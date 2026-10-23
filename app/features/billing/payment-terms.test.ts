import {
  applicationPhase,
  billingCycleLabel,
  estimatedSpendLabel,
  formatCurrencyAmount,
  formatLongDate,
  latestApplication,
  paymentTermsSummary,
} from './payment-terms';
import type { BillingAccount, BillingArrangementApplication } from './types';
import { describe, expect, it } from 'bun:test';

function application(
  name: string,
  created: string,
  overrides: {
    account?: string;
    withdrawn?: boolean;
    phase?: NonNullable<BillingArrangementApplication['status']>['phase'];
    deleting?: boolean;
  } = {}
): BillingArrangementApplication {
  return {
    metadata: {
      name,
      creationTimestamp: created,
      deletionTimestamp: overrides.deleting ? '2026-10-10T00:00:00Z' : undefined,
    },
    spec: {
      billingAccountRef: { name: overrides.account ?? 'acme' },
      paymentOption: 'Invoice',
      organization: { legalName: 'Acme Ltd', type: 'Company', website: 'https://acme.com' },
      situation: 'We pay by PO.',
      authorized: true,
      withdrawn: overrides.withdrawn,
    },
    status: overrides.phase ? { phase: overrides.phase } : undefined,
  };
}

describe('applicationPhase', () => {
  it('reads a decision from status', () => {
    expect(applicationPhase(application('a', '2026-10-01T00:00:00Z', { phase: 'Approved' }))).toBe(
      'Approved'
    );
    expect(applicationPhase(application('a', '2026-10-01T00:00:00Z', { phase: 'Declined' }))).toBe(
      'Declined'
    );
  });

  it('fills the gap before the controller catches up', () => {
    expect(applicationPhase(application('a', '2026-10-01T00:00:00Z'))).toBe('Pending');
    // Withdrawn moments ago: status still says Pending.
    expect(
      applicationPhase(
        application('a', '2026-10-01T00:00:00Z', { withdrawn: true, phase: 'Pending' })
      )
    ).toBe('Withdrawn');
    // A decision outranks a withdrawal that raced it, as in billing.
    expect(
      applicationPhase(
        application('a', '2026-10-01T00:00:00Z', { withdrawn: true, phase: 'Declined' })
      )
    ).toBe('Declined');
  });
});

describe('latestApplication', () => {
  const apps = [
    application('first', '2026-10-01T00:00:00Z', { phase: 'Declined' }),
    application('second', '2026-10-05T00:00:00Z'),
    application('newer-but-deleting', '2026-10-06T00:00:00Z', { deleting: true }),
    application('other-account', '2026-10-07T00:00:00Z', { account: 'globex' }),
  ];

  it("picks the account's newest application", () => {
    expect(latestApplication(apps, 'acme')?.metadata?.name).toBe('second');
  });

  it('ignores applications being deleted and other accounts', () => {
    expect(latestApplication(apps, 'globex')?.metadata?.name).toBe('other-account');
    expect(latestApplication(apps, 'nobody')).toBeUndefined();
    expect(latestApplication(apps, undefined)).toBeUndefined();
  });
});

describe('formatting', () => {
  it('formats amounts in the account currency', () => {
    expect(formatCurrencyAmount('10000', 'USD')).toBe('$10,000');
    expect(formatCurrencyAmount('2500.5', 'USD')).toBe('$2,500.50');
    expect(formatCurrencyAmount('10000', 'GBP')).toBe('£10,000');
  });

  it('labels spend bands', () => {
    expect(estimatedSpendLabel('Under500')).toBe('Under $500');
    expect(estimatedSpendLabel('From2500To10000')).toBe('$2,500–$10,000');
    expect(estimatedSpendLabel('Over10000', 'EUR')).toBe('Over €10,000');
    expect(estimatedSpendLabel('NotSure')).toBe('Not sure yet');
  });

  it('formats dates the way the mockups do', () => {
    expect(formatLongDate('2026-10-02T09:00:00Z')).toBe('2 October 2026');
    expect(formatLongDate(undefined)).toBeUndefined();
    expect(formatLongDate('not a date')).toBeUndefined();
  });
});

describe('paymentTermsSummary', () => {
  const account: BillingAccount = {
    metadata: { name: 'acme' },
    spec: {
      currencyCode: 'USD',
      contactInfo: { email: 'jane@acme.com', invoiceEmails: ['jane@acme.com', 'ap@acme.com'] },
      paymentTerms: { invoiceFrequency: 'Monthly', invoiceDayOfMonth: 1 },
    },
    status: {
      paymentArrangement: {
        name: 'acme-terms',
        type: 'Invoice',
        startsAt: '2026-10-02T00:00:00Z',
        invoice: {
          netDays: 45,
          creditLimit: '10000',
          accountsPayableEmail: 'ap@acme.com',
          purchaseOrderNumber: 'PO-4471',
        },
      },
    },
  };

  it('summarizes the active terms', () => {
    expect(paymentTermsSummary(account)).toEqual({
      name: 'acme-terms',
      netDays: 45,
      // AP email first, without repeating it from the invoice recipients.
      invoiceRecipients: ['ap@acme.com', 'jane@acme.com'],
      purchaseOrderNumber: 'PO-4471',
      billingCycle: 'Monthly, on the 1st',
      startsAt: '2026-10-02T00:00:00Z',
      endsAt: undefined,
    });
  });

  it('is undefined without active terms', () => {
    expect(paymentTermsSummary({ ...account, status: {} })).toBeUndefined();
    expect(paymentTermsSummary(undefined)).toBeUndefined();
  });

  it('labels the billing cycle', () => {
    expect(billingCycleLabel(undefined)).toBe('Monthly, on the 1st');
    expect(
      billingCycleLabel({
        spec: {
          currencyCode: 'USD',
          paymentTerms: { invoiceFrequency: 'Quarterly', invoiceDayOfMonth: 22 },
        },
      })
    ).toBe('Quarterly, on the 22nd');
  });
});
