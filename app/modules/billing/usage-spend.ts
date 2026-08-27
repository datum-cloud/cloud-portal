import type { MeterDimensionBreakdown, MeterSeries } from './usage.types';

export interface CatalogPricingRate {
  match?: { dimension: string; value: string };
  flat?: number;
  tiered?: Array<{ upTo?: number; rate: number }>;
}

export interface CatalogMeterPricing {
  metric: string;
  pricingUnit: string;
  currency: string;
  rates: CatalogPricingRate[];
}

export interface ComputedMeterSpend {
  spend?: number;
  unitRate?: number;
  pricingAvailable: boolean;
}

function parseDecimal(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parseCatalogRates(
  rates:
    | Array<{
        flat?: string;
        match?: { dimension: string; value: string };
        tiered?: Array<{ upTo?: string; rate: string }>;
      }>
    | undefined
): CatalogPricingRate[] {
  return (rates ?? [])
    .map((rate): CatalogPricingRate | null => {
      const parsed: CatalogPricingRate = {};
      if (rate.match) {
        parsed.match = rate.match;
      }
      if (rate.flat) {
        const flat = parseDecimal(rate.flat);
        if (flat === undefined) return null;
        parsed.flat = flat;
      } else if (rate.tiered?.length) {
        const tiered: Array<{ upTo?: number; rate: number }> = [];
        for (const band of rate.tiered) {
          const bandRate = parseDecimal(band.rate);
          if (bandRate === undefined) continue;
          tiered.push({
            upTo: band.upTo ? parseDecimal(band.upTo) : undefined,
            rate: bandRate,
          });
        }
        if (tiered.length === 0) return null;
        parsed.tiered = tiered;
      } else {
        return null;
      }
      return parsed;
    })
    .filter((rate): rate is CatalogPricingRate => rate !== null);
}

/** Convert meter-native usage into ServicePricing pricingUnit counts. */
export function usageToPricingUnits(
  used: number,
  meterUnit: string | undefined,
  pricingUnit: string
): number {
  if (used <= 0) return 0;
  const pu = pricingUnit.trim().toLowerCase();
  const mu = (meterUnit ?? '').toLowerCase();

  if (pu === 'gb' || pu === 'gib') {
    if (mu.includes('by') || mu === 'b') {
      return used / 1024 ** 3;
    }
  }
  if (pu === 'mb' || pu === 'mib') {
    if (mu.includes('by') || mu === 'b') {
      return used / 1024 ** 2;
    }
  }
  if (pu === 'kb' || pu === 'kib') {
    if (mu.includes('by') || mu === 'b') {
      return used / 1024;
    }
  }

  return used;
}

/** Graduated tier spend in pricingUnit counts (bands use exclusive upTo). */
export function computeTieredSpend(units: number, tiers: CatalogPricingRate['tiered']): number {
  if (!tiers?.length || units <= 0) return 0;

  let spend = 0;
  let previousUpTo = 0;

  for (const band of tiers) {
    const bandStart = previousUpTo;
    const bandEnd = band.upTo ?? Number.POSITIVE_INFINITY;
    const unitsInBand = Math.min(units, bandEnd) - bandStart;
    if (unitsInBand > 0) {
      spend += unitsInBand * band.rate;
    }
    if (band.upTo !== undefined) {
      previousUpTo = band.upTo;
    } else {
      break;
    }
    if (units <= bandEnd) break;
  }

  return spend;
}

export function computeRateSpend(units: number, rate: CatalogPricingRate): number | undefined {
  if (units <= 0) return 0;
  if (rate.flat !== undefined) return units * rate.flat;
  if (rate.tiered?.length) return computeTieredSpend(units, rate.tiered);
  return undefined;
}

/** Convert a flat rate per pricingUnit into rate per meter-native unit. */
export function flatRatePerMeterUnit(
  flatPerPricingUnit: number,
  meterUnit: string | undefined,
  pricingUnit: string
): number {
  const oneUnit = usageToPricingUnits(1, meterUnit, pricingUnit);
  if (oneUnit <= 0) return flatPerPricingUnit;
  return flatPerPricingUnit * oneUnit;
}

function sumPoints(values: { value: number }[]): number {
  return values.reduce((total, point) => total + point.value, 0);
}

function spendFromBreakdowns(
  meter: MeterSeries,
  pricing: CatalogMeterPricing
): ComputedMeterSpend | null {
  const matchedRates = pricing.rates.filter((rate) => rate.match);
  if (matchedRates.length === 0) return null;

  const matchDimensions = new Set(matchedRates.map((rate) => rate.match!.dimension));
  const breakdowns = meter.breakdowns ?? [];
  const relevant = breakdowns.filter((b) => matchDimensions.has(b.dimension));
  if (relevant.length === 0) return null;

  let spend = 0;
  let matchedUsage = 0;
  let matchedAny = false;

  for (const breakdown of relevant) {
    for (const series of breakdown.series) {
      const rate = pricing.rates.find(
        (candidate) =>
          candidate.match?.dimension === breakdown.dimension &&
          candidate.match.value === series.groupValue
      );
      if (!rate) continue;

      const seriesUsed = sumPoints(series.values);
      if (seriesUsed <= 0) continue;

      const units = usageToPricingUnits(seriesUsed, meter.unit, pricing.pricingUnit);
      const seriesSpend = computeRateSpend(units, rate);
      if (seriesSpend === undefined) continue;

      spend += seriesSpend;
      matchedUsage += seriesUsed;
      matchedAny = true;
    }
  }

  if (!matchedAny) return null;

  return {
    spend,
    unitRate: matchedUsage > 0 ? spend / matchedUsage : undefined,
    pricingAvailable: true,
  };
}

/** Unmatched catalog rate to show when usage is zero (includes a $0 flat). */
function indicativeUnitRate(
  pricing: CatalogMeterPricing,
  meterUnit: string | undefined
): number | undefined {
  const unmatched = pricing.rates.find((rate) => !rate.match);
  if (!unmatched) return undefined;
  if (unmatched.flat !== undefined) {
    return flatRatePerMeterUnit(unmatched.flat, meterUnit, pricing.pricingUnit);
  }
  const band = unmatched.tiered?.find((tier) => tier.rate !== undefined);
  if (band) {
    return flatRatePerMeterUnit(band.rate, meterUnit, pricing.pricingUnit);
  }
  return undefined;
}

/**
 * Estimate period spend from catalog Offer rates × Amberflo usage.
 * Dimension-matched rates use breakdown series when present; otherwise falls
 * back to the unmatched/default rate entry.
 */
export function computeMeterSpend(
  meter: MeterSeries,
  pricing: CatalogMeterPricing | undefined
): ComputedMeterSpend {
  if (!pricing || pricing.rates.length === 0) {
    return { pricingAvailable: false };
  }

  const fromBreakdown = spendFromBreakdowns(meter, pricing);
  if (fromBreakdown) return fromBreakdown;

  const used = meter.used ?? sumPoints(meter.values);
  if (used <= 0) {
    const unitRate = indicativeUnitRate(pricing, meter.unit);
    return {
      // Only stamp $0 spend when we also have a displayable rate. Dimension-
      // only prices with no usage would otherwise show `$0` next to `—`.
      spend: unitRate !== undefined ? 0 : undefined,
      unitRate,
      pricingAvailable: true,
    };
  }

  const defaultRate =
    pricing.rates.find((rate) => !rate.match) ??
    (pricing.rates.length === 1 && !pricing.rates[0]?.match ? pricing.rates[0] : undefined);

  if (!defaultRate) {
    return { pricingAvailable: true };
  }

  const pricingUnits = usageToPricingUnits(used, meter.unit, pricing.pricingUnit);
  const spend = computeRateSpend(pricingUnits, defaultRate);
  if (spend === undefined) {
    return { pricingAvailable: true };
  }

  let unitRate: number | undefined;
  if (defaultRate.flat !== undefined) {
    unitRate = flatRatePerMeterUnit(defaultRate.flat, meter.unit, pricing.pricingUnit);
  } else if (used > 0) {
    unitRate = spend / used;
  }

  return { spend, unitRate, pricingAvailable: true };
}

export function enrichMetersWithCatalogSpend(
  meters: MeterSeries[],
  pricingByMetric: Map<string, CatalogMeterPricing>,
  meterNameByApiName: Map<string, string>,
  offerName?: string
): {
  meters: MeterSeries[];
  totalSpend?: number;
  currencyCode: string;
  offerName?: string;
} {
  let totalSpend = 0;
  let anySpendComputed = false;
  let currencyCode = 'USD';

  const enriched = meters.map((meter) => {
    const metric = meter.meterName ?? meterNameByApiName.get(meter.meterApiName);
    const pricing = metric ? pricingByMetric.get(metric) : undefined;
    if (pricing?.currency) currencyCode = pricing.currency;
    const computed = computeMeterSpend(meter, pricing);
    if (computed.spend !== undefined) {
      totalSpend += computed.spend;
      anySpendComputed = true;
    }
    return {
      ...meter,
      spend: computed.spend,
      unitRate: computed.unitRate,
      pricingUnit: pricing?.pricingUnit,
    };
  });

  return {
    meters: enriched,
    totalSpend: anySpendComputed ? totalSpend : undefined,
    currencyCode,
    offerName,
  };
}

/** Exported for tests — pick spend from breakdown when dimensions are priced. */
export function computeSpendForBreakdown(
  breakdown: MeterDimensionBreakdown,
  pricing: CatalogMeterPricing,
  meterUnit: string | undefined
): number {
  let spend = 0;
  for (const series of breakdown.series) {
    const rate = pricing.rates.find(
      (candidate) =>
        candidate.match?.dimension === breakdown.dimension &&
        candidate.match.value === series.groupValue
    );
    if (!rate) continue;
    const units = usageToPricingUnits(sumPoints(series.values), meterUnit, pricing.pricingUnit);
    const part = computeRateSpend(units, rate);
    if (part !== undefined) spend += part;
  }
  return spend;
}
