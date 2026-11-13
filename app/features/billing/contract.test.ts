import { chargeNames, contractInvoiceSchedule, contractSummary } from './contract';
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
          frequency: 'Every month',
          billing: 'Billed in advance',
        },
      ],
      usageBilled: true,
      upcomingInvoices: [
        {
          date: '2026-05-18T00:00:00.000Z',
          dueDate: '2026-06-17T00:00:00.000Z',
          charges: [{ label: 'acme-monthly', total: 2400.5 }],
          total: '$2,400.50',
          billsUsage: true,
        },
      ],
      hasFeesInArrears: false,
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
        quantity: '4 × $300 / port',
        frequency: 'Every month',
        billing: 'Billed in advance',
      },
      {
        name: 'acme-power',
        label: 'Power',
        chargeType: 'Recurring',
        amount: '$0.30 / month',
        quantity: '3 × $0.10 / kW',
        frequency: 'Every month',
        billing: 'Billed in advance',
      },
    ]);
  });

  it('says how often each fee is charged, when, and for how long', () => {
    const terms: BillingAccount = {
      ...account,
      status: {
        contract: {
          startsAt: '2026-11-12T00:00:00Z',
          billingDayOfMonth: 12,
          fees: [
            {
              name: 'support',
              displayName: 'Support',
              chargeType: 'Recurring',
              amount: '20000.00',
              currency: 'USD',
              interval: 'quarterly',
              billingTiming: 'InArrears',
            },
            {
              name: 'link',
              displayName: 'Private link',
              chargeType: 'Recurring',
              amount: '6000.00',
              currency: 'USD',
              interval: 'annual',
              billingTiming: 'InAdvance',
              periods: 3,
              endsAt: '2029-11-12T00:00:00Z',
            },
          ],
        },
      },
    };
    const summary = contractSummary(terms, Date.parse('2026-11-12T12:00:00Z'));
    expect(summary?.fees).toEqual([
      {
        name: 'support',
        label: 'Support',
        chargeType: 'Recurring',
        amount: '$20,000 / quarter',
        frequency: 'Every quarter',
        billing: 'Billed in arrears',
      },
      {
        name: 'link',
        label: 'Private link',
        chargeType: 'Recurring',
        amount: '$6,000 / year',
        frequency: 'Every year',
        billing: 'Billed in advance',
        renewals: 'For 3 years',
        endsAt: '2029-11-12T00:00:00Z',
      },
    ]);
    expect(summary?.hasFeesInArrears).toBe(true);
    // The quarterly fee in arrears lands at each quarter's end.
    expect(summary?.upcomingInvoices.map((invoice) => invoice.date.slice(0, 10))).toEqual([
      '2027-02-12',
      '2027-05-12',
      '2027-08-12',
      '2027-11-12',
    ]);
  });

  it('stops charging a fee with renewals after its last period', () => {
    const contract = {
      startsAt: '2026-11-12T00:00:00Z',
      billingDayOfMonth: 12,
      fees: [
        {
          name: 'promo',
          chargeType: 'Recurring' as const,
          amount: '100.00',
          currency: 'USD',
          interval: 'monthly' as const,
          billingTiming: 'InAdvance' as const,
          periods: 3,
        },
      ],
    };
    expect(contractInvoiceSchedule(contract, undefined).map((i) => i.date.slice(0, 10))).toEqual([
      '2026-11-12',
      '2026-12-12',
      '2027-01-12',
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
  it("says when the contract's day takes over, before it starts", () => {
    expect(billingCycleLabel(account, beforeStart)).toBe(
      'Monthly, on the 18th from April 18, 2026'
    );
    expect(paymentTermsSummary(account, beforeStart)?.billingCycle).toBe(
      'Monthly, on the 18th from April 18, 2026'
    );
  });

  it("follows the contract's day once it has started", () => {
    expect(billingCycleLabel(account, afterStart)).toBe('Monthly, on the 18th');
    expect(paymentTermsSummary(account, afterStart)?.billingCycle).toBe('Monthly, on the 18th');
  });
});

describe('chargeNames', () => {
  const charges = (...labels: string[]) => labels.map((label) => ({ label, total: 1 }));
  it('names one or two fees, and counts the rest', () => {
    expect(chargeNames(charges('Private link'))).toBe('Private link');
    expect(chargeNames(charges('Private link', 'Cross connect'))).toBe(
      'Private link and Cross connect'
    );
    expect(chargeNames(charges('Private link', 'Cross connect', 'Support', 'Power', 'Racks'))).toBe(
      'Private link, Cross connect and 3 more'
    );
  });
});
