import { type MetricFormat, type PrometheusQueryOptions } from '@/modules/prometheus';

const prometheusQueryKeys = {
  all: ['prometheus-api'] as const,
  charts: () => [...prometheusQueryKeys.all, 'charts'] as const,
  chart: (options: PrometheusQueryOptions) =>
    [...prometheusQueryKeys.charts(), options.query, options.timeRange, options.step] as const,
  cards: () => [...prometheusQueryKeys.all, 'cards'] as const,
  card: (options: PrometheusQueryOptions & { metricFormat?: MetricFormat }) =>
    [
      ...prometheusQueryKeys.cards(),
      options.query,
      options.timeRange,
      options.metricFormat,
    ] as const,
  connections: () => [...prometheusQueryKeys.all, 'connections'] as const,
  buildInfo: () => [...prometheusQueryKeys.all, 'build-info'] as const,
};

export { prometheusQueryKeys };
