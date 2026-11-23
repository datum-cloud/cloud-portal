import { billingPeriodSummary } from './billing-period';
import { contractSummary } from './contract';
import type { BillingAccount } from './types';
import { describe, expect, it } from 'vitest';

const now = Date.parse('2026-11-23T12:00:00Z');

const payAsYouGo: BillingAccount = {
  metadata: { name: 'acme' },
  spec: {
    currencyCode: 'USD',
    paymentTerms: { invoiceFrequency: 'Monthly', invoiceDayOfMonth: 1 },
  },
};

function withContract(startsAt: string, billingDayOfMonth: number): BillingAccount {
  return {
    ...payAsYouGo,
    status: {
      contract: {
        startsAt,
        billingDayOfMonth,
        fees: [
          {
            name: 'acme-monthly',
            displayName: 'Platform fee',
            chargeType: 'Recurring',
            amount: '100.00',
            currency: 'USD',
            interval: 'monthly',
          },
        ],
        usageBilled: true,
      },
    },
  };
}

const summarize = (account: BillingAccount) =>
  billingPeriodSummary(account, contractSummary(account, now), now);

const day = (iso: string) => iso.slice(0, 10);

describe('billingPeriodSummary', () => {
  it("invoices a pay-as-you-go account's usage at the end of its period", () => {
    const summary = summarize(payAsYouGo);
    expect(day(summary.start)).toBe('2026-11-01');
    expect(day(summary.end)).toBe('2026-12-01');
    expect(day(summary.nextInvoice.date)).toBe('2026-12-01');
    expect(summary.nextInvoice).toMatchObject({ charges: [], billsUsage: true });
    expect(summary.nextInvoice.total).toBeUndefined();
  });

  it("follows a started contract's billing day and fees", () => {
    const summary = summarize(withContract('2026-06-15T00:00:00Z', 15));
    expect(day(summary.start)).toBe('2026-11-15');
    expect(day(summary.end)).toBe('2026-12-15');
    expect(day(summary.nextInvoice.date)).toBe('2026-12-15');
    expect(summary.nextInvoice.total).toBe('$100');
    expect(summary.nextInvoice.billsUsage).toBe(true);
  });

  it('shows a contract starting before the period ends as the next invoice', () => {
    const summary = summarize(withContract('2026-11-27T00:00:00Z', 27));
    expect(day(summary.end)).toBe('2026-12-01');
    expect(day(summary.nextInvoice.date)).toBe('2026-11-27');
    expect(summary.nextInvoice.total).toBe('$100');
  });

  it('keeps the period end when a contract starts after it', () => {
    const summary = summarize(withContract('2027-01-10T00:00:00Z', 10));
    expect(day(summary.nextInvoice.date)).toBe('2026-12-01');
    expect(summary.nextInvoice.total).toBeUndefined();
  });
});
