import { formatInTimeZone } from 'date-fns-tz';
import type { ReactNode } from 'react';

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
    return { domain: [0, 1], ticks: [0, 1] };
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
/** Compact Y-axis labels so "800.00 req/s" does not eat the plot. */
export function formatReqPerSecTick(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value) >= 10) return `${Math.round(value)}`;
  if (Math.abs(value) >= 1) return value.toFixed(1);
  if (value === 0) return '0';
  return value.toFixed(2);
}

export function formatChartTimeTick(timestamp: number, rangeMs: number, timezone: string): string {
  const date = new Date(timestamp);
  if (rangeMs < SIX_HOURS_MS) return formatInTimeZone(date, timezone, 'h:mm a');
  if (rangeMs < FORTY_EIGHT_HOURS_MS) return formatInTimeZone(date, timezone, 'MMM d, h:mm a');
  return formatInTimeZone(date, timezone, 'MMM d');
}

/**
 * Narrow a Recharts tooltip label to something `<DateTime>` accepts.
 *
 * datum-ui types `ChartTooltipContent`'s `labelFormatter` value as `ReactNode`
 * because Recharts allows any category value on the X axis. These charts all
 * plot time series keyed by epoch milliseconds, so the label is really a
 * timestamp — the type just can't say so. Anything that isn't date-like
 * becomes `''`, which `<DateTime>` treats as an invalid date and renders as
 * nothing rather than throwing.
 */
export function toChartLabelDate(label: ReactNode): string | Date {
  if (label instanceof Date) return label;
  if (typeof label === 'number') return new Date(label);
  if (typeof label === 'string') return label;
  return '';
}

type ChartRow = { timestamp: number } & Record<string, number | null>;

export type BucketAggregation = 'sum' | 'avg' | 'max';

const AUTO_STEPS: Array<{ label: string; ms: number }> = [
  { label: '15s', ms: 15_000 },
  { label: '1m', ms: 60_000 },
  { label: '5m', ms: 300_000 },
  { label: '10m', ms: 600_000 },
  { label: '15m', ms: 900_000 },
  { label: '30m', ms: 1_800_000 },
  { label: '1h', ms: 3_600_000 },
];

const AUTO_MIN_POINTS = 16;

/**
 * Grafana-style interval: coarsest step that still yields enough points
 * for a 30–60 minute window to read as a series, not two needles.
 */
export function autoStepForRange(rangeMs: number): string {
  if (!Number.isFinite(rangeMs) || rangeMs <= 0) return '1m';
  for (let i = AUTO_STEPS.length - 1; i >= 0; i--) {
    const step = AUTO_STEPS[i];
    if (rangeMs / step.ms >= AUTO_MIN_POINTS) return step.label;
  }
  return AUTO_STEPS[0].label;
}

/** Resolve `auto` (or a missing step) against the selected time range. */
export function resolveChartStep(step: string | undefined, rangeMs: number): string {
  if (!step || step === 'auto') return autoStepForRange(rangeMs);
  return step;
}

/**
 * Pixel width for a bar that represents one step on a numeric time axis.
 * Recharts otherwise draws time-scale bars as 1px needles.
 */
export function timeBucketBarWidth(
  plotWidth: number,
  rangeMs: number,
  stepMs: number,
  gap = 0.22
): number {
  if (plotWidth <= 0 || rangeMs <= 0 || stepMs <= 0) return 8;
  const bucketPx = plotWidth * (stepMs / rangeMs);
  return Math.max(4, Math.min(72, Math.floor(bucketPx * (1 - gap))));
}

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
  aggregation: BucketAggregation = 'sum',
  emptyValue: number | null = 0
): ChartRow[] {
  if (stepMs <= 0 || seriesKeys.length === 0) return data;

  const blanks = Object.fromEntries(seriesKeys.map((k) => [k, emptyValue]));
  const buckets = new Map<number, ChartRow>();
  const sampleCounts = new Map<number, Record<string, number>>();

  for (let t = startMs; t <= endMs; t += stepMs) {
    buckets.set(t, { timestamp: t, ...blanks });
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
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;

      if (aggregation === 'max') {
        const current = bucket[key];
        bucket[key] =
          typeof current === 'number' && Number.isFinite(current)
            ? Math.max(current, value)
            : value;
      } else if (aggregation === 'avg') {
        const current = bucket[key];
        bucket[key] =
          (typeof current === 'number' && Number.isFinite(current) ? current : 0) + value;
        const counts = sampleCounts.get(bucketTs)!;
        counts[key] = (counts[key] ?? 0) + 1;
      } else {
        const current = bucket[key];
        bucket[key] =
          (typeof current === 'number' && Number.isFinite(current) ? current : 0) + value;
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
        } else {
          bucket[key] = emptyValue;
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
        if (typeof value === 'number' && Number.isFinite(value)) sum += value;
      }
      if (sum > max) max = sum;
    } else {
      for (const key of seriesKeys) {
        const value = row[key];
        if (typeof value === 'number' && Number.isFinite(value) && value > max) max = value;
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

/** Pick labels from real bar categories so every synced chart shows the same times. */
export function pickEvenlySpaced<T>(items: T[], count: number): T[] {
  if (items.length === 0 || count <= 1) return items.slice(0, Math.max(count, 0));
  if (items.length <= count) return items;
  return Array.from({ length: count }, (_, i) => {
    const index = Math.round((i * (items.length - 1)) / (count - 1));
    return items[index];
  });
}
