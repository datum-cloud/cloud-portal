import { contractSummary } from './contract';
import { billingCycleLabel, paymentTermsSummary } from './payment-terms';
import type { BillingAccount } from './types';
import { describe, expect, it } from 'vitest';

const account: BillingAccount = {
  metadata: { name: 'acme' },
  spec: {
    currencyCode: 'USD',
    paymentTerms: { invoiceFrequency: 'Monthly', invoiceDayOfMonth: 1 },
  },
  status: {
    paymentArrangement: {
      name: 'acme-terms',
      type: 'Invoice',
      invoice: { netDays: 30, creditLimit: '10000', accountsPayableEmail: 'ap@acme.com' },
    },
    contract: {
      startsAt: '2026-04-18T00:00:00Z',
      billingDayOfMonth: 18,
      fees: [
        {
          name: 'acme-setup',
          displayName: 'Setup fee',
          chargeType: 'OneTime',
          amount: '5000.00',
          currency: 'USD',
        },
        {
          name: 'acme-monthly',
          chargeType: 'Recurring',
          amount: '2400.50',
          currency: 'USD',
          interval: 'monthly',
        },
      ],
      usageBilled: true,
    },
  },
};

const beforeStart = Date.parse('2026-04-01T00:00:00Z');
const afterStart = Date.parse('2026-05-01T00:00:00Z');

describe('contractSummary', () => {
  it('summarizes the contract and its fees', () => {
    expect(contractSummary(account, afterStart)).toEqual({
      startsAt: '2026-04-18T00:00:00Z',
      started: true,
      billingDayOfMonth: 18,
      fees: [
        { name: 'acme-setup', label: 'Setup fee', chargeType: 'OneTime', amount: '$5,000' },
        {
          name: 'acme-monthly',
          label: 'acme-monthly',
          chargeType: 'Recurring',
          amount: '$2,400.50 / month',
        },
      ],
      usageBilled: true,
    });
  });

  it("isn't started before its start date", () => {
    expect(contractSummary(account, beforeStart)?.started).toBe(false);
  });

  it('is undefined without a contract', () => {
    expect(contractSummary({ ...account, status: {} }, afterStart)).toBeUndefined();
    expect(contractSummary(undefined, afterStart)).toBeUndefined();
  });
});

describe('billing cycle with a contract', () => {
  it('follows the payment terms until the contract starts', () => {
    expect(billingCycleLabel(account, beforeStart)).toBe('Monthly, on the 1st');
    expect(paymentTermsSummary(account, beforeStart)?.billingCycle).toBe('Monthly, on the 1st');
  });

  it("follows the contract's day once it has started", () => {
    expect(billingCycleLabel(account, afterStart)).toBe('Monthly, on the 18th');
    expect(paymentTermsSummary(account, afterStart)?.billingCycle).toBe('Monthly, on the 18th');
  });
});
