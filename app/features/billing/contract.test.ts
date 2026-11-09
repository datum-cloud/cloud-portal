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

  it('charges a fee times its quantity, and says how it adds up', () => {
    const withQuantities: BillingAccount = {
      ...account,
      status: {
        contract: {
          startsAt: '2026-04-18T00:00:00Z',
          billingDayOfMonth: 18,
          fees: [
            {
              name: 'acme-racks',
              displayName: 'Rack setup',
              chargeType: 'OneTime',
              amount: '500.00',
              quantity: 3,
              currency: 'USD',
            },
            {
              name: 'acme-ports',
              displayName: 'Cross connect',
              chargeType: 'Recurring',
              amount: '300.00',
              quantity: 4,
              pricingUnit: 'port',
              currency: 'USD',
              interval: 'monthly',
            },
            {
              name: 'acme-power',
              displayName: 'Power',
              chargeType: 'Recurring',
              amount: '0.10',
              quantity: 3,
              pricingUnit: 'kW',
              currency: 'USD',
              interval: 'monthly',
            },
          ],
        },
      },
    };
    expect(contractSummary(withQuantities, afterStart)?.fees).toEqual([
      {
        name: 'acme-racks',
        label: 'Rack setup',
        chargeType: 'OneTime',
        amount: '$1,500',
        quantity: '3 × $500',
      },
      {
        name: 'acme-ports',
        label: 'Cross connect',
        chargeType: 'Recurring',
        amount: '$1,200 / month',
        quantity: '4 port × $300',
      },
      {
        name: 'acme-power',
        label: 'Power',
        chargeType: 'Recurring',
        amount: '$0.30 / month',
        quantity: '3 kW × $0.10',
      },
    ]);
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
