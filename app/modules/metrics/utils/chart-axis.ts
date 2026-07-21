import { formatInTimeZone } from 'date-fns-tz';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * Compute a linear Y-axis domain and evenly spaced tick values.
 * Ticks are generated from the same step used to compute the domain max,
 * so label positions match their numeric values on a linear scale.
 */
export function getLinearYAxisScale(
  maxValue: number,
  tickCount = 5
): { domain: [number, number]; ticks: number[] } {
  if (maxValue <= 0) {
    return { domain: [0, 4], ticks: [0, 1, 2, 3, 4] };
  }

  const roughStep = maxValue / Math.max(tickCount - 1, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let niceStep: number;
  if (normalized <= 1) niceStep = magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const niceMax = Math.ceil((maxValue * 1.05) / niceStep) * niceStep;
  const ticks: number[] = [];

  for (let value = 0; value <= niceMax + niceStep * 0.001; value += niceStep) {
    ticks.push(Number.isInteger(niceStep) ? value : Math.round(value * 100) / 100);
  }

  return { domain: [0, niceMax], ticks };
}

/** @deprecated Use getLinearYAxisScale — kept for callers that only need the domain. */
export function getLinearYDomain(maxValue: number, tickCount = 5): [number, number] {
  return getLinearYAxisScale(maxValue, tickCount).domain;
}

/** @deprecated Use getLinearYAxisScale — kept for callers that only need ticks. */
export function buildUniformYTicks(domain: [number, number], tickCount = 5): number[] {
  return getLinearYAxisScale(domain[1], tickCount).ticks;
}

/**
 * Pick an X-axis time label format based on the selected range width.
 * Renders in the given timezone so ticks match the picker and tooltips,
 * which are timezone-aware — falling back to the runtime's local zone
 * would otherwise silently mislabel every tick.
 */
export function formatChartTimeTick(timestamp: number, rangeMs: number, timezone: string): string {
  const date = new Date(timestamp);
  if (rangeMs < SIX_HOURS_MS) return formatInTimeZone(date, timezone, 'h:mm a');
  if (rangeMs < FORTY_EIGHT_HOURS_MS) return formatInTimeZone(date, timezone, 'MMM d, h:mm a');
  return formatInTimeZone(date, timezone, 'MMM d');
}

type ChartRow = Record<string, number>;

export type BucketAggregation = 'sum' | 'avg' | 'max';

/**
 * Fill a time-series dataset with zero-valued points at every step interval
 * across the selected window so Recharts distributes X-axis ticks evenly.
 * @deprecated Prefer bucketDataToTimeRange for synced charts — keeping sub-step
 * points breaks cross-chart hover alignment.
 */
export function padDataToTimeRange(
  data: ChartRow[],
  startMs: number,
  endMs: number,
  stepMs: number,
  seriesKeys: string[]
): ChartRow[] {
  if (stepMs <= 0 || seriesKeys.length === 0) return data;

  const zeros = Object.fromEntries(seriesKeys.map((k) => [k, 0]));
  const byTimestamp = new Map<number, ChartRow>();

  for (const row of data) {
    byTimestamp.set(row.timestamp, { ...row });
  }

  for (let t = startMs; t <= endMs; t += stepMs) {
    if (!byTimestamp.has(t)) {
      byTimestamp.set(t, { timestamp: t, ...zeros });
    }
  }

  return Array.from(byTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Bucket time-series data to fixed step intervals for aligned X-axis points.
 * Use for all padToTimeRange charts (especially synced groups) so hover/cursor
 * lines match across area, line, and bar charts.
 */
export function bucketDataToTimeRange(
  data: ChartRow[],
  startMs: number,
  endMs: number,
  stepMs: number,
  seriesKeys: string[],
  aggregation: BucketAggregation = 'sum'
): ChartRow[] {
  if (stepMs <= 0 || seriesKeys.length === 0) return data;

  const zeros = Object.fromEntries(seriesKeys.map((k) => [k, 0]));
  const buckets = new Map<number, ChartRow>();
  const sampleCounts = new Map<number, Record<string, number>>();

  for (let t = startMs; t <= endMs; t += stepMs) {
    buckets.set(t, { timestamp: t, ...zeros });
    if (aggregation === 'avg') {
      sampleCounts.set(t, Object.fromEntries(seriesKeys.map((k) => [k, 0])));
    }
  }

  for (const row of data) {
    if (row.timestamp < startMs || row.timestamp > endMs) continue;

    const offset = row.timestamp - startMs;
    const bucketTs = startMs + Math.floor(offset / stepMs) * stepMs;
    const bucket = buckets.get(bucketTs);
    if (!bucket) continue;

    for (const key of seriesKeys) {
      const value = row[key];
      if (typeof value !== 'number') continue;

      if (aggregation === 'max') {
        bucket[key] = Math.max(bucket[key] as number, value);
      } else if (aggregation === 'avg') {
        bucket[key] = (bucket[key] as number) + value;
        const counts = sampleCounts.get(bucketTs)!;
        counts[key] = (counts[key] ?? 0) + 1;
      } else {
        bucket[key] = (bucket[key] as number) + value;
      }
    }
  }

  if (aggregation === 'avg') {
    for (const [bucketTs, bucket] of buckets) {
      const counts = sampleCounts.get(bucketTs);
      if (!counts) continue;
      for (const key of seriesKeys) {
        const count = counts[key] ?? 0;
        if (count > 0) {
          bucket[key] = (bucket[key] as number) / count;
        }
      }
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Sanitize a series name for use in SVG gradient id attributes.
 */
export function sanitizeGradientId(name: string): string {
  return `metric-fill-${name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/**
 * Compute the maximum numeric value across chart data.
 * When `stacked` is true, uses the per-timestamp sum of all series (for stacked bars).
 */
export function getChartDataMax(
  data: ChartRow[],
  seriesKeys: string[],
  options?: { stacked?: boolean }
): number {
  let max = 0;
  for (const row of data) {
    if (options?.stacked) {
      let sum = 0;
      for (const key of seriesKeys) {
        const value = row[key];
        if (typeof value === 'number') sum += value;
      }
      if (sum > max) max = sum;
    } else {
      for (const key of seriesKeys) {
        const value = row[key];
        if (typeof value === 'number' && value > max) max = value;
      }
    }
  }
  return max;
}

/**
 * Evenly spaced timestamp ticks for a fixed time window — keeps synced charts aligned.
 */
export function buildTimeAxisTicks(startMs: number, endMs: number, tickCount = 6): number[] {
  if (endMs <= startMs) return [startMs];
  const step = (endMs - startMs) / Math.max(tickCount - 1, 1);
  const ticks: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    ticks.push(Math.round(startMs + step * i));
  }
  return ticks;
}
