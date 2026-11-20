import { formatPricingUnit, pricingSummary } from './pricing';
import type { BillingAccount } from './types';
import { describe, expect, it } from 'vitest';

type Prices = NonNullable<NonNullable<BillingAccount['status']>['prices']>;

function account(prices: Prices | undefined): BillingAccount {
  return { status: { prices } };
}

describe('pricingSummary', () => {
  it('is undefined when billing publishes no prices', () => {
    expect(pricingSummary(undefined)).toBeUndefined();
    expect(pricingSummary(account(undefined))).toBeUndefined();
    expect(pricingSummary(account([]))).toBeUndefined();
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
        name: 'assistant-output-tokens-v1',
        label: 'Output tokens',
        serviceRef: 'assistant.miloapis.com',
        rates: [{ match: undefined, bands: [{ price: '$15.00 per million tokens' }] }],
        discountPercentage: 0,
      },
      {
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
                { upTo: '10240', rate: '0.05' },
                { upTo: '153600', rate: '0.04' },
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

  it('formats fixed fees and leaves out excluded ones', () => {
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
      ]),
      { excludeFees: new Set(['setup-v1']) }
    );
    expect(summary?.usage).toEqual([]);
    expect(summary?.fees).toEqual([
      {
        name: 'support-v1',
        label: 'Support',
        chargeType: 'Recurring',
        amount: '3 × $1,000 / month',
        discountPercentage: 0,
      },
      {
        name: 'licence-v1',
        label: 'Licence',
        chargeType: 'Recurring',
        amount: '$12,000 / year',
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
