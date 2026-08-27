import {
  catalogListRate,
  computeMeterSpend,
  computeRateSpend,
  computeTieredSpend,
  enrichMetersWithCatalogSpend,
  flatRatePerMeterUnit,
  parseCatalogRates,
  usageToPricingUnits,
} from './usage-spend';
import type { CatalogMeterPricing } from './usage-spend';
import type { MeterSeries } from './usage.types';
import { describe, expect, it } from 'bun:test';

function meter(overrides: Partial<MeterSeries> = {}): MeterSeries {
  return {
    meterApiName: 'meter-uid',
    meterName: 'test.metric',
    label: 'Test',
    values: [],
    ...overrides,
  };
}

function pricing(overrides: Partial<CatalogMeterPricing> = {}): CatalogMeterPricing {
  return {
    metric: 'test.metric',
    pricingUnit: 'token',
    currency: 'USD',
    rates: [{ flat: 0.001 }],
    ...overrides,
  };
}

describe('parseCatalogRates', () => {
  it('parses flat and dimension-matched rates', () => {
    expect(
      parseCatalogRates([
        { flat: '0.05' },
        { flat: '0.10', match: { dimension: 'model_name', value: 'gpt-4' } },
      ])
    ).toEqual([{ flat: 0.05 }, { flat: 0.1, match: { dimension: 'model_name', value: 'gpt-4' } }]);
  });

  it('parses tiered bands with exclusive upTo', () => {
    expect(
      parseCatalogRates([
        {
          tiered: [{ upTo: '200', rate: '0' }, { upTo: '10240', rate: '0.05' }, { rate: '0.03' }],
        },
      ])
    ).toEqual([
      {
        tiered: [
          { upTo: 200, rate: 0 },
          { upTo: 10240, rate: 0.05 },
          { upTo: undefined, rate: 0.03 },
        ],
      },
    ]);
  });

  it('drops invalid entries', () => {
    expect(parseCatalogRates([{ flat: 'not-a-number' }, { tiered: [{ rate: '' }] }])).toEqual([]);
  });
});

describe('usageToPricingUnits', () => {
  it('converts bytes to gibibytes', () => {
    expect(usageToPricingUnits(1024 ** 3, 'By', 'GiB')).toBe(1);
    expect(usageToPricingUnits(2 * 1024 ** 3, 'bytes', 'GB')).toBe(2);
  });

  it('passes through count units unchanged', () => {
    expect(usageToPricingUnits(1_000_000, 'token', 'token')).toBe(1_000_000);
  });
});

describe('computeTieredSpend', () => {
  const tiers = [{ upTo: 200, rate: 0 }, { upTo: 10_240, rate: 0.05 }, { rate: 0.03 }];

  it('charges nothing within the free tier', () => {
    expect(computeTieredSpend(100, tiers)).toBe(0);
  });

  it('applies graduated bands across tier boundaries', () => {
    // 200 free + 800 at $0.05 = $40
    expect(computeTieredSpend(1_000, tiers)).toBe(40);
    // 200 free + 10_040 at $0.05 + 760 at $0.03 = $524.8
    expect(computeTieredSpend(11_000, tiers)).toBe(524.8);
  });

  it('returns zero for non-positive usage', () => {
    expect(computeTieredSpend(0, tiers)).toBe(0);
  });
});

describe('computeRateSpend', () => {
  it('computes flat and tiered spend', () => {
    expect(computeRateSpend(100, { flat: 0.02 })).toBe(2);
    expect(
      computeRateSpend(1_000, {
        tiered: [{ upTo: 200, rate: 0 }, { rate: 0.05 }],
      })
    ).toBe(40);
  });
});

describe('flatRatePerMeterUnit', () => {
  it('converts per-GiB pricing to per-byte rate', () => {
    const perByte = flatRatePerMeterUnit(0.05, 'By', 'GiB');
    expect(perByte * 1024 ** 3).toBeCloseTo(0.05);
  });

  it('leaves same-unit pricing unchanged', () => {
    expect(flatRatePerMeterUnit(0.002, 'token', 'token')).toBe(0.002);
  });
});

describe('catalogListRate', () => {
  it('returns a flat rate as-is', () => {
    expect(catalogListRate({ flat: 0.05 })).toBe(0.05);
  });

  it('uses the last tier as the list price', () => {
    expect(
      catalogListRate({
        tiered: [
          { upTo: 1, rate: 0 },
          { rate: 0.09 },
        ],
      })
    ).toBe(0.09);
  });
});

describe('computeMeterSpend', () => {
  it('computes flat-rate spend from aggregate usage', () => {
    const result = computeMeterSpend(
      meter({ used: 10_000, unit: 'token' }),
      pricing({ pricingUnit: 'token', rates: [{ flat: 0.001 }] })
    );
    expect(result).toEqual({
      spend: 10,
      unitRate: 0.001,
      pricingAvailable: true,
    });
  });

  it('uses breakdown series for dimension-matched rates', () => {
    const result = computeMeterSpend(
      meter({
        unit: 'token',
        breakdowns: [
          {
            dimension: 'model_name',
            series: [
              { groupValue: 'gpt-4', values: [{ timestamp: 1, value: 1_000 }] },
              { groupValue: 'claude', values: [{ timestamp: 1, value: 500 }] },
            ],
          },
        ],
      }),
      pricing({
        pricingUnit: 'token',
        rates: [
          { flat: 0.01, match: { dimension: 'model_name', value: 'gpt-4' } },
          { flat: 0.005, match: { dimension: 'model_name', value: 'claude' } },
        ],
      })
    );
    expect(result.spend).toBe(12.5);
    expect(result.unitRate).toBeCloseTo(12.5 / 1_500);
    expect(result.pricingAvailable).toBe(true);
  });

  it('keeps the catalog per-GB list price instead of converting to per-byte', () => {
    const used = 208 * 1024;
    const result = computeMeterSpend(
      meter({ used, unit: 'By' }),
      pricing({ pricingUnit: 'GB', rates: [{ flat: 0.09 }] })
    );
    expect(result.unitRate).toBe(0.09);
    expect(result.spend).toBeCloseTo((used / 1024 ** 3) * 0.09);
    expect(result.pricingAvailable).toBe(true);
  });

  it('shows the paid list price when usage is still in a free first band', () => {
    const used = 208 * 1024;
    const result = computeMeterSpend(
      meter({ used, unit: 'By' }),
      pricing({
        pricingUnit: 'GB',
        rates: [
          {
            tiered: [
              { upTo: 1, rate: 0 },
              { rate: 0.09 },
            ],
          },
        ],
      })
    );
    expect(result.spend).toBe(0);
    expect(result.unitRate).toBe(0.09);
  });

  it('returns spend undefined when only dimension rates exist without breakdowns', () => {
    const result = computeMeterSpend(
      meter({ used: 5_000, unit: 'token' }),
      pricing({
        pricingUnit: 'token',
        rates: [{ flat: 0.01, match: { dimension: 'model_name', value: 'gpt-4' } }],
      })
    );
    expect(result.spend).toBeUndefined();
    expect(result.pricingAvailable).toBe(true);
  });

  it('returns pricing unavailable when no catalog entry exists', () => {
    expect(computeMeterSpend(meter({ used: 100 }), undefined)).toEqual({
      pricingAvailable: false,
    });
  });

  it('shows zero spend with indicative rate when usage is zero', () => {
    const result = computeMeterSpend(
      meter({ used: 0, unit: 'token' }),
      pricing({ pricingUnit: 'token', rates: [{ flat: 0.002 }] })
    );
    expect(result.spend).toBe(0);
    expect(result.unitRate).toBe(0.002);
  });

  it('shows the catalog per-GB rate when byte usage is zero', () => {
    const result = computeMeterSpend(
      meter({ used: 0, unit: 'By' }),
      pricing({ pricingUnit: 'GB', rates: [{ flat: 0.09 }] })
    );
    expect(result.spend).toBe(0);
    expect(result.unitRate).toBe(0.09);
  });

  it('shows a $0 rate when the unmatched catalog flat is zero', () => {
    const result = computeMeterSpend(
      meter({ used: 0, unit: 'token' }),
      pricing({ pricingUnit: 'token', rates: [{ flat: 0 }] })
    );
    expect(result.spend).toBe(0);
    expect(result.unitRate).toBe(0);
  });

  it('omits spend and rate when zero usage has only dimension-matched prices', () => {
    const result = computeMeterSpend(
      meter({ used: 0, unit: 'token' }),
      pricing({
        pricingUnit: 'token',
        rates: [{ flat: 0.01, match: { dimension: 'model_name', value: 'gpt-4' } }],
      })
    );
    expect(result.spend).toBeUndefined();
    expect(result.unitRate).toBeUndefined();
    expect(result.pricingAvailable).toBe(true);
  });
});

describe('enrichMetersWithCatalogSpend', () => {
  it('omits totalSpend when no meter spend could be computed', () => {
    const pricingByMetric = new Map<string, CatalogMeterPricing>([
      [
        'assistant.tokens',
        {
          metric: 'assistant.tokens',
          pricingUnit: 'token',
          currency: 'USD',
          rates: [{ flat: 0.01, match: { dimension: 'model_name', value: 'gpt-4' } }],
        },
      ],
    ]);

    const result = enrichMetersWithCatalogSpend(
      [meter({ meterName: 'assistant.tokens', used: 1_000, unit: 'token' })],
      pricingByMetric,
      new Map()
    );

    expect(result.totalSpend).toBeUndefined();
    expect(result.meters[0]?.spend).toBeUndefined();
  });

  it('sums spend across meters when at least one is computable', () => {
    const pricingByMetric = new Map<string, CatalogMeterPricing>([
      ['flat.metric', pricing({ metric: 'flat.metric', rates: [{ flat: 0.01 }] })],
      [
        'dim.metric',
        {
          metric: 'dim.metric',
          pricingUnit: 'token',
          currency: 'USD',
          rates: [{ flat: 0.01, match: { dimension: 'model_name', value: 'gpt-4' } }],
        },
      ],
    ]);

    const result = enrichMetersWithCatalogSpend(
      [
        meter({ meterName: 'flat.metric', used: 100, unit: 'token' }),
        meter({ meterName: 'dim.metric', used: 500, unit: 'token' }),
      ],
      pricingByMetric,
      new Map()
    );

    expect(result.totalSpend).toBe(1);
    expect(result.meters[0]?.spend).toBe(1);
    expect(result.meters[1]?.spend).toBeUndefined();
  });
});
