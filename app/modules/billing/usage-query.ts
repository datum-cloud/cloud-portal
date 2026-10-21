/**
 * Pure helpers that turn MeterDefinitions into `UsageQuery` requests and
 * `UsageQuery` results into the dashboard's `MeterSeries`.
 */
import { resolveMeterGroup } from './usage-groups';
import type {
  MeterBreakdownSeries,
  MeterDefinition,
  MeterDimensionBreakdown,
  MeterPoint,
  MeterSeries,
} from './usage.types';
import type {
  ComMiloapisGoBillingApiUsageV1Alpha1MeterUsage as MeterUsage,
  ComMiloapisGoBillingApiUsageV1Alpha1UsagePoint as UsagePoint,
  ComMiloapisGoBillingApiUsageV1Alpha1UsageSeries as UsageSeries,
} from '@/modules/control-plane/usage';

const DAY_MS = 24 * 3600 * 1000;

// Cap the per-meter breakdown tabs; the UI only surfaces a handful.
const MAX_BREAKDOWN_DIMENSIONS = 3;

/** Platform dimension injected by the billing pipeline (a system dimension). */
const PROJECT_BREAKDOWN_DIMENSION = 'project_name';

const HIDDEN_BREAKDOWN_DIMENSIONS = new Set(['gateway_class', 'httproute_namespace']);

/** Dimensions to request a breakdown for, in tab order. */
export function breakdownDimensions(def: MeterDefinition, includeProject: boolean): string[] {
  const declared = def.dimensions ?? [];
  const projectAvailable =
    declared.includes(PROJECT_BREAKDOWN_DIMENSION) ||
    (def.systemDimensions ?? []).includes(PROJECT_BREAKDOWN_DIMENSION);
  const dims = declared
    .filter(
      (dimension) =>
        dimension !== PROJECT_BREAKDOWN_DIMENSION && !HIDDEN_BREAKDOWN_DIMENSIONS.has(dimension)
    )
    .slice(0, MAX_BREAKDOWN_DIMENSIONS);
  return includeProject && projectAvailable ? [PROJECT_BREAKDOWN_DIMENSION, ...dims] : dims;
}

// `UsageQuery` accepts at most this many groupings per request.
const MAX_GROUPINGS_PER_QUERY = 10;

/** Every breakdown dimension any meter shows, in first-seen order. */
export function breakdownDimensionsUnion(
  defs: MeterDefinition[],
  includeProject: boolean
): string[] {
  return [...new Set(defs.flatMap((def) => breakdownDimensions(def, includeProject)))];
}

/**
 * Split the breakdowns across `UsageQuery` requests. With `spec.meters`
 * left empty, one query reads every meter, and a grouping by a dimension a
 * meter lacks just has no series for it. Only the grouping limit can force
 * a second query: the first carries the total (and the spend), any others
 * only the overflow breakdowns.
 */
export function planGroupings(dimensions: string[]): string[][] {
  const plans: string[][] = [dimensions.slice(0, MAX_GROUPINGS_PER_QUERY - 1)];
  for (let i = MAX_GROUPINGS_PER_QUERY - 1; i < dimensions.length; i += MAX_GROUPINGS_PER_QUERY) {
    plans.push(dimensions.slice(i, i + MAX_GROUPINGS_PER_QUERY));
  }
  return plans;
}

/** One meter's results gathered from every query, keyed by `groupBy`. */
export interface MeterQueryResult {
  /** The meter's entry from the first query: unit, aggregation, spend. */
  usage?: MeterUsage;
  /** Set when any query could not read the meter. */
  error?: string;
  /** Series by `groupBy` joined with `,`; `''` is the total. */
  seriesByGroupBy: Map<string, UsageSeries[]>;
}

export function collectMeterResults(
  statuses: { meters?: MeterUsage[] }[]
): Map<string, MeterQueryResult> {
  const byMeter = new Map<string, MeterQueryResult>();
  for (const status of statuses) {
    for (const usage of status.meters ?? []) {
      const result: MeterQueryResult = byMeter.get(usage.meterDefinition) ?? {
        seriesByGroupBy: new Map(),
      };
      result.usage ??= usage;
      result.error ||= usage.error || undefined;
      for (const grouping of usage.groupings ?? []) {
        result.seriesByGroupBy.set((grouping.groupBy ?? []).join(','), grouping.series ?? []);
      }
      byMeter.set(usage.meterDefinition, result);
    }
  }
  return byMeter;
}

/** `UsageSpend` with its decimal amount parsed. */
export function toSpend(
  spend: { amount: string; currency: string } | undefined
): MeterSeries['spend'] {
  return spend ? { amount: parseDecimal(spend.amount), currency: spend.currency } : undefined;
}

function parseDecimal(value: string | undefined): number {
  const n = Number.parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
}

/** UTC day starts from the day containing `startSec` up to `endSec`. */
export function dayBuckets(startSec: number, endSec: number): number[] {
  const start = new Date(startSec * 1000);
  const buckets: number[] = [];
  for (
    let ts = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    ts < endSec * 1000;
    ts += DAY_MS
  ) {
    buckets.push(ts);
  }
  return buckets;
}

/**
 * `UsageQuery` leaves out buckets without usage. Fill the gaps with zero so
 * the daily bars line up across the cycle, but keep a series with no usage
 * at all empty so empty states stay accurate.
 */
function toPoints(points: UsagePoint[] | undefined, buckets: number[]): MeterPoint[] {
  if (!points?.length) return [];
  const byTimestamp = new Map<number, number>(buckets.map((ts) => [ts, 0]));
  for (const point of points) {
    byTimestamp.set(Date.parse(point.start), parseDecimal(point.value));
  }
  return [...byTimestamp.entries()]
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function toBreakdownSeries(
  series: UsageSeries[] | undefined,
  dimension: string,
  buckets: number[]
): MeterBreakdownSeries[] {
  return (
    (series ?? [])
      .map((s) => ({
        groupValue: s.group?.[dimension] ?? '',
        total: parseDecimal(s.total),
        values: toPoints(s.points, buckets),
      }))
      // A dimension the events did not set comes back as `""`; skip it so
      // breakdown tabs don't mirror the Total series.
      .filter((s) => s.groupValue && s.values.length > 0)
  );
}

/**
 * One meter's `UsageQuery` results as a `MeterSeries`. `dimensions` are the
 * breakdowns to show for it. A meter the backend could not read comes back
 * with no usage.
 */
export function toMeterSeries(
  def: MeterDefinition,
  result: MeterQueryResult | undefined,
  dimensions: string[],
  buckets: number[]
): MeterSeries {
  const group = resolveMeterGroup(def.meterName);
  const usage = result?.usage;
  const base: MeterSeries = {
    meterDefinition: def.name,
    meterName: def.meterName,
    label: def.displayName,
    values: [],
    total: 0,
    description: def.description,
    unit: usage?.unit || def.unit,
    aggregation: usage?.aggregation || def.aggregation,
    dimensions: def.dimensions,
    groupId: group.id,
    groupTitle: group.title,
    spend: toSpend(usage?.spend),
    spendUnavailable: Boolean(usage?.spendError) || undefined,
  };

  if (!result || result.error) return base;

  const totalSeries = result.seriesByGroupBy.get('')?.[0];
  const breakdowns: MeterDimensionBreakdown[] = dimensions
    .map((dimension) => ({
      dimension,
      series: toBreakdownSeries(result.seriesByGroupBy.get(dimension), dimension, buckets),
    }))
    .filter((breakdown) => breakdown.series.length > 0);

  return {
    ...base,
    values: toPoints(totalSeries?.points, buckets),
    total: parseDecimal(totalSeries?.total),
    breakdowns,
  };
}
