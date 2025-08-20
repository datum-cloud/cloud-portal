import { type MetricFormat, type PrometheusQueryOptions } from '@/modules/prometheus';

const prometheusQueryKeys = {
  all: ['prometheus-api'] as const,
  charts: () => [...prometheusQueryKeys.all, 'charts'] as const,
  chart: (options: PrometheusQueryOptions & { lastRefreshed?: Date | null }) =>
    [
      ...prometheusQueryKeys.charts(),
      options.query,
      options.timeRange,
      options.step,
      options.lastRefreshed?.getTime(),
    ] as const,
  cards: () => [...prometheusQueryKeys.all, 'cards'] as const,
  card: (
    options: PrometheusQueryOptions & { metricFormat?: MetricFormat; lastRefreshed?: Date | null }
  ) =>
    [
      ...prometheusQueryKeys.cards(),
      options.query,
      options.timeRange,
      options.metricFormat,
      options.lastRefreshed?.getTime(),
    ] as const,
  connections: () => [...prometheusQueryKeys.all, 'connections'] as const,
  buildInfo: () => [...prometheusQueryKeys.all, 'build-info'] as const,
};

export { prometheusQueryKeys };
