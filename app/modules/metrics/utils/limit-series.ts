import type { ChartDataPoint, ChartSeries, FormattedMetricData } from '@/modules/prometheus';

const OTHER_COLOR = 'var(--muted-foreground)';

function seriesVolume(series: ChartSeries): number {
  let total = 0;
  for (const point of series.data) {
    if (typeof point.value === 'number' && Number.isFinite(point.value)) total += point.value;
  }
  return total;
}

function statusSortKey(name: string): number {
  const code = Number.parseInt(name, 10);
  return Number.isFinite(code) ? code : Number.POSITIVE_INFINITY;
}

function mergeSeries(series: ChartSeries[], name: string): ChartSeries {
  const byTimestamp = new Map<number, ChartDataPoint>();

  for (const item of series) {
    for (const point of item.data) {
      const value =
        typeof point.value === 'number' && Number.isFinite(point.value) ? point.value : 0;
      const existing = byTimestamp.get(point.timestamp);
      if (existing) {
        existing.value += value;
      } else {
        byTimestamp.set(point.timestamp, {
          timestamp: point.timestamp,
          value,
          formattedTime: point.formattedTime,
        });
      }
    }
  }

  return {
    name,
    color: OTHER_COLOR,
    labels: {},
    data: Array.from(byTimestamp.values()).sort((a, b) => a.timestamp - b.timestamp),
  };
}

/**
 * Keep the busiest series and roll the rest into "Other" so status-code
 * charts do not grow a series per distinct code.
 */
export function limitSeriesByVolume(
  data: FormattedMetricData,
  maxSeries: number,
  otherName = 'Other'
): FormattedMetricData {
  if (!Number.isFinite(maxSeries) || maxSeries < 1 || data.series.length <= maxSeries) {
    return data;
  }

  const ranked = [...data.series].sort((a, b) => seriesVolume(b) - seriesVolume(a));
  const keep = ranked.slice(0, maxSeries - 1);
  const rest = ranked.slice(maxSeries - 1);
  keep.sort((a, b) => statusSortKey(a.name) - statusSortKey(b.name));

  return {
    ...data,
    series: rest.length > 0 ? [...keep, mergeSeries(rest, otherName)] : keep,
  };
}
