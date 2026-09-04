import type { ChartSeries } from '@/modules/prometheus';
import { formatValue } from '@/modules/prometheus';

const REGION_LABEL = 'label_topology_kubernetes_io_region';

export type ActivePopMetrics = {
  rps?: number;
  latency?: number;
  errorRps?: number;
};

export function latestSeriesValue(series: ChartSeries | undefined): number | undefined {
  if (!series?.data.length) return undefined;
  for (let index = series.data.length - 1; index >= 0; index -= 1) {
    const value = series.data[index]?.value;
    if (value != null && Number.isFinite(value)) return value;
  }
  return undefined;
}

export function seriesByRegion(
  series: ChartSeries[] | undefined,
  region: string
): ChartSeries | undefined {
  return series?.find((item) => item.labels?.[REGION_LABEL] === region || item.name === region);
}

export function formatRps(value: number | undefined): string {
  if (value == null) return '—';
  if (value > 0 && value < 0.01) return '<0.01 req/s';
  return formatValue(value, 'requestsPerSecond', 2);
}

export function formatLatency(value: number | undefined): string {
  if (value == null || value <= 0) return '—';
  return `${formatValue(value, 'milliseconds-auto', 1)} p95`;
}

export function formatErrors(errorRps: number | undefined, totalRps: number | undefined): string {
  if (errorRps == null || totalRps == null || totalRps <= 0) return '—';
  return `${formatValue(errorRps / totalRps, 'percent', 1)} 5xx`;
}

export function formatActivePopMetrics(metrics: ActivePopMetrics | undefined): string {
  if (!metrics) return 'Collecting metrics…';
  const parts = [
    formatRps(metrics.rps),
    formatLatency(metrics.latency),
    formatErrors(metrics.errorRps, metrics.rps),
  ].filter((part) => part !== '—');
  return parts.length ? parts.join(' · ') : 'Collecting metrics…';
}

export function metricsForTrafficRegion(
  trafficRegion: string,
  rpsSeries: ChartSeries[] | undefined,
  errorSeries: ChartSeries[] | undefined,
  latencySeries: ChartSeries[] | undefined
): ActivePopMetrics {
  const rps = latestSeriesValue(seriesByRegion(rpsSeries, trafficRegion));
  return {
    rps,
    errorRps: latestSeriesValue(seriesByRegion(errorSeries, trafficRegion)),
    latency: latestSeriesValue(seriesByRegion(latencySeries, trafficRegion)),
  };
}
