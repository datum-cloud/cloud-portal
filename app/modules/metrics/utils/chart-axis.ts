import { format } from 'date-fns';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

/**
 * Compute a linear Y-axis domain [0, niceMax] with evenly spaced tick intervals.
 */
export function getLinearYDomain(maxValue: number, tickCount = 5): [number, number] {
  if (maxValue <= 0) return [0, 4];

  const roughStep = maxValue / Math.max(tickCount - 1, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  let niceStep: number;
  if (normalized <= 1) niceStep = magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const niceMax = Math.ceil(maxValue / niceStep) * niceStep;
  return [0, niceMax];
}

/**
 * Build evenly spaced Y-axis tick values for a [0, max] domain.
 */
export function buildUniformYTicks(domain: [number, number], tickCount = 5): number[] {
  const [min, max] = domain;
  if (max <= min) return [min];

  const step = (max - min) / Math.max(tickCount - 1, 1);
  const ticks: number[] = [];
  for (let i = 0; i < tickCount; i++) {
    const value = min + step * i;
    ticks.push(
      Number.isInteger(max) && max <= 20 ? Math.round(value) : Math.round(value * 100) / 100
    );
  }
  return ticks;
}

/**
 * Pick an X-axis time label format based on the selected range width.
 */
export function formatChartTimeTick(timestamp: number, rangeMs: number): string {
  const date = new Date(timestamp);
  if (rangeMs < SIX_HOURS_MS) return format(date, 'h:mm a');
  if (rangeMs < FORTY_EIGHT_HOURS_MS) return format(date, 'MMM d, h:mm a');
  return format(date, 'MMM d');
}

type ChartRow = Record<string, number>;

/**
 * Fill a time-series dataset with zero-valued points at every step interval
 * across the selected window so Recharts distributes X-axis ticks evenly.
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
 * Sanitize a series name for use in SVG gradient id attributes.
 */
export function sanitizeGradientId(name: string): string {
  return `metric-fill-${name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/**
 * Compute the maximum numeric value across all series keys in chart data.
 */
export function getChartDataMax(data: ChartRow[], seriesKeys: string[]): number {
  let max = 0;
  for (const row of data) {
    for (const key of seriesKeys) {
      const value = row[key];
      if (typeof value === 'number' && value > max) max = value;
    }
  }
  return max;
}
