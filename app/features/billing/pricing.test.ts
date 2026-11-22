import { contractSummary } from './contract';
import { formatPricingUnit, priceList, type FeePrice, type UsagePrice } from './pricing';
import type { BillingAccount } from './types';
import { describe, expect, it } from 'vitest';

type Status = NonNullable<BillingAccount['status']>;
type Prices = NonNullable<Status['prices']>;

function account(prices: Prices | undefined, contract?: Status['contract']): BillingAccount {
  return { status: { prices, ...(contract ? { contract } : {}) } };
}

/** The list split by kind, for tests that look at one or the other. */
function pricingSummary(acct: BillingAccount | undefined) {
  const items = priceList(acct);
  if (!items) return undefined;
  return {
    usage: items.filter((item): item is UsagePrice => item.kind === 'usage'),
    fees: items.filter((item): item is FeePrice => item.kind === 'fee'),
  };
}

describe('priceList', () => {
  it('is undefined when there is nothing to list', () => {
    expect(priceList(undefined)).toBeUndefined();
    expect(priceList(account(undefined))).toBeUndefined();
    expect(priceList(account([]))).toBeUndefined();
  });

  it("lists the contract's fees first, with their details and discounts, then plan fees and usage", () => {
    const acct = account(
      [
        {
          name: 'alb-requests-v1',
          displayName: 'ALB Requests',
          chargeType: 'Usage',
          currency: 'USD',
          pricingUnit: 'request',
          rates: [{ flat: '0.000001' }],
        },
        {
          name: 'support-v1',
          displayName: 'Support',
          chargeType: 'Recurring',
          interval: 'monthly',
          currency: 'USD',
          amount: '500',
        },
        {
          name: 'server-v1',
          displayName: 'Dedicated server',
          chargeType: 'Recurring',
          interval: 'monthly',
          currency: 'USD',
          amount: '1000',
          discountPercentage: 10,
        },
      ],
      {
        startsAt: '2026-11-12T00:00:00Z',
        billingDayOfMonth: 12,
        usageBilled: true,
        fees: [
          {
            name: 'server-v1',
            displayName: 'Dedicated server',
            chargeType: 'Recurring',
            interval: 'monthly',
            currency: 'USD',
            amount: '1000',
            quantity: 1,
            pricingUnit: 'server',
            billingTiming: 'InArrears',
            periods: 8,
            endsAt: '2027-07-12T00:00:00Z',
          },
          {
            name: 'setup-v1',
            displayName: 'Setup',
            chargeType: 'OneTime',
            currency: 'USD',
            amount: '2500',
          },
        ],
      }
    );
    const items = priceList(acct, contractSummary(acct, Date.parse('2026-11-20T00:00:00Z')));
    expect(items?.map((item) => item.label)).toEqual([
      'Dedicated server',
      'Setup',
      'Support',
      'ALB Requests',
    ]);
    expect(items?.[0]).toEqual({
      kind: 'fee',
      name: 'server-v1',
      label: 'Dedicated server',
      chargeType: 'Recurring',
      amount: '$1,000 / month',
      details: ['1 × $1,000 / server', 'For 8 months'],
      endsAt: '2027-07-12T00:00:00Z',
      timing: 'Billed in arrears',
      discountPercentage: 10,
    });
    expect(items?.[1]).toMatchObject({ amount: '$2,500', timing: 'One-time', details: [] });
  });

  it("lists a contract's fees even before billing publishes prices", () => {
    const acct = account(undefined, {
      startsAt: '2026-11-12T00:00:00Z',
      billingDayOfMonth: 12,
      fees: [
        {
          name: 'setup-v1',
          displayName: 'Setup',
          chargeType: 'OneTime',
          currency: 'USD',
          amount: '2500',
        },
      ],
    });
    expect(priceList(acct, contractSummary(acct, 0))?.map((item) => item.label)).toEqual(['Setup']);
  });

  // Formats follow the public pricing page (datum.net/pricing).
  it('writes tiny rates on counted things per million', () => {
    const summary = pricingSummary(
      account([
        {
          name: 'networking-alb-requests-v1',
          displayName: 'ALB Requests',
          serviceRef: 'networking.datumapis.com',
          chargeType: 'Usage',
          currency: 'USD',
          pricingUnit: 'request',
          rates: [{ flat: '0.000001' }],
        },
        {
          name: 'assistant-output-tokens-v1',
          displayName: 'Output tokens',
          serviceRef: 'assistant.miloapis.com',
          chargeType: 'Usage',
          currency: 'USD',
          pricingUnit: 'token',
          rates: [{ flat: '0.000015' }],
        },
      ])
    );
    expect(summary?.usage).toEqual([
      {
        kind: 'usage',
        name: 'assistant-output-tokens-v1',
        label: 'Output tokens',
        serviceRef: 'assistant.miloapis.com',
        rates: [{ match: undefined, bands: [{ price: '$15.00 per million tokens' }] }],
        discountPercentage: 0,
      },
      {
        kind: 'usage',
        name: 'networking-alb-requests-v1',
        label: 'ALB Requests',
        serviceRef: 'networking.datumapis.com',
        rates: [{ match: undefined, bands: [{ price: '$1.00 per million requests' }] }],
        discountPercentage: 0,
      },
    ]);
  });

  it('gives per-second rates to eight places with the hourly rate', () => {
    const summary = pricingSummary(
      account([
        {
          name: 'compute-cpu-v1',
          displayName: 'Compute vCPU',
          chargeType: 'Usage',
          currency: 'USD',
          pricingUnit: 'vcpu-second',
          rates: [{ flat: '0.000014' }],
        },
        {
          name: 'compute-memory-v1',
          displayName: 'Compute Memory',
          chargeType: 'Usage',
          currency: 'USD',
          pricingUnit: 'gib-second',
          rates: [{ flat: '0.0000045' }],
        },
      ])
    );
    expect(summary?.usage.map((p) => p.rates[0]?.bands)).toEqual([
      [{ price: '$0.00000450 per GiB per second', perHour: '$0.0162 per GiB per hour' }],
      [{ price: '$0.00001400 per vCPU per second', perHour: '$0.0504 per vCPU per hour' }],
    ]);
  });

  it('writes data tiers in TB where they fit, like the pricing page', () => {
    const summary = pricingSummary(
      account([
        {
          name: 'networking-alb-egress-v1',
          displayName: 'ALB Egress',
          chargeType: 'Usage',
          currency: 'USD',
          pricingUnit: 'GB',
          rates: [
            {
              tiered: [
                { upTo: '200', rate: '0' },
                { upTo: '10000', rate: '0.05' },
                { upTo: '150000', rate: '0.04' },
                { rate: '0.03' },
              ],
            },
          ],
          discountPercentage: 20,
        },
      ])
    );
    expect(summary?.usage[0]?.rates[0]?.bands).toEqual([
      { range: '0 – 200 GB', price: 'Free' },
      { range: '200 GB – 10 TB', price: '$0.05 per GB' },
      { range: '10 – 150 TB', price: '$0.04 per GB' },
      { range: '150 TB+', price: '$0.03 per GB' },
    ]);
    expect(summary?.usage[0]?.discountPercentage).toBe(20);
  });

  it('counts GiB tiers in 1,024s and GB tiers in 1,000s', () => {
    const tiers = (pricingUnit: string) =>
      pricingSummary(
        account([
          {
            name: 'egress',
            chargeType: 'Usage',
            currency: 'USD',
            pricingUnit,
            rates: [{ tiered: [{ upTo: '10240', rate: '0.05' }, { rate: '0.04' }] }],
          },
        ])
      )?.usage[0]?.rates[0]?.bands.map((band) => band.range);
    expect(tiers('gib')).toEqual(['0 – 10 TiB', '10 TiB+']);
    expect(tiers('GB')).toEqual(['0 – 10,240 GB', '10,240 GB+']);
  });

  it('abbreviates counted tier boundaries', () => {
    const summary = pricingSummary(
      account([
        {
          name: 'dns-requests-v1',
          displayName: 'DNS Requests',
          chargeType: 'Usage',
          currency: 'USD',
          pricingUnit: 'request',
          rates: [{ tiered: [{ upTo: '500000', rate: '0' }, { rate: '0.0000006' }] }],
        },
      ])
    );
    expect(summary?.usage[0]?.rates[0]?.bands).toEqual([
      { range: '0 – 500K requests', price: 'Free' },
      { range: '500K requests+', price: '$0.60 per million requests' },
    ]);
  });

  it('labels matched rates and the catch-all after them when prices differ', () => {
    const summary = pricingSummary(
      account([
        {
          name: 'compute-cpu-v1',
          displayName: 'Compute vCPU',
          chargeType: 'Usage',
          currency: 'USD',
          pricingUnit: 'vcpu-second',
          rates: [
            { match: { dimension: 'runtime_class', value: 'gpu' }, flat: '0.0001' },
            { flat: '0.000014' },
          ],
        },
      ])
    );
    expect(summary?.usage[0]?.rates.map((r) => r.match)).toEqual([
      'runtime_class: gpu',
      'Everything else',
    ]);
  });

  it('shows one price when every matched rate costs the same', () => {
    const summary = pricingSummary(
      account([
        {
          name: 'compute-memory-v1',
          displayName: 'Compute Memory',
          chargeType: 'Usage',
          currency: 'USD',
          pricingUnit: 'gib-second',
          rates: [
            { match: { dimension: 'runtime_class', value: 'general-purpose' }, flat: '0.0000045' },
            { flat: '0.0000045' },
          ],
        },
      ])
    );
    expect(summary?.usage[0]?.rates).toEqual([
      {
        bands: [{ price: '$0.00000450 per GiB per second', perHour: '$0.0162 per GiB per hour' }],
      },
    ]);
  });

  it('formats plan fees with their quantity and interval', () => {
    const summary = pricingSummary(
      account([
        {
          name: 'support-v1',
          displayName: 'Support',
          chargeType: 'Recurring',
          interval: 'monthly',
          currency: 'USD',
          amount: '1000',
          quantity: 3,
        },
        {
          name: 'licence-v1',
          displayName: 'Licence',
          chargeType: 'Recurring',
          interval: 'annual',
          currency: 'USD',
          amount: '12000',
        },
        {
          name: 'setup-v1',
          displayName: 'Setup fee',
          chargeType: 'OneTime',
          currency: 'USD',
          amount: '500',
        },
      ])
    );
    expect(summary?.usage).toEqual([]);
    expect(summary?.fees).toEqual([
      {
        kind: 'fee',
        name: 'support-v1',
        label: 'Support',
        chargeType: 'Recurring',
        amount: '$3,000 / month',
        details: ['3 × $1,000'],
        discountPercentage: 0,
      },
      {
        kind: 'fee',
        name: 'licence-v1',
        label: 'Licence',
        chargeType: 'Recurring',
        amount: '$12,000 / year',
        details: [],
        discountPercentage: 0,
      },
      {
        kind: 'fee',
        name: 'setup-v1',
        label: 'Setup fee',
        chargeType: 'OneTime',
        amount: '$500',
        details: [],
        timing: 'One-time',
        discountPercentage: 0,
      },
    ]);
  });

  it('sorts usage prices by service, then label', () => {
    const summary = pricingSummary(
      account([
        {
          name: 'b',
          displayName: 'Zeta',
          serviceRef: 'b.svc',
          chargeType: 'Usage',
          currency: 'USD',
        },
        {
          name: 'a',
          displayName: 'Beta',
          serviceRef: 'a.svc',
          chargeType: 'Usage',
          currency: 'USD',
        },
        {
          name: 'c',
          displayName: 'Alpha',
          serviceRef: 'b.svc',
          chargeType: 'Usage',
          currency: 'USD',
        },
      ])
    );
    expect(summary?.usage.map((p) => p.label)).toEqual(['Beta', 'Alpha', 'Zeta']);
  });
});

describe('formatPricingUnit', () => {
  it('capitalises well-known unit words', () => {
    expect(formatPricingUnit('vcpu-second')).toBe('vCPU-second');
    expect(formatPricingUnit('gib-second')).toBe('GiB-second');
    expect(formatPricingUnit('token')).toBe('token');
  });
});
