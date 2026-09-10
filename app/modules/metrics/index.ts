/**
 * Metrics module exports
 */

// Constants
export * from './constants';

// Export components
export { MetricCard } from './components/metric-card';
export { MetricChart } from './components/metric-chart';
export { MetricsToolbar } from './components/metrics-toolbar';
export { MetricsToolbar as MetricsControls } from './components/metrics-toolbar'; // Alias for backward compatibility
export { MetricChartTooltipContent, MetricsChartTooltip } from './components';
export * from './components/filters';
// Export provider and hooks
export { MetricsProvider, useMetrics } from './context/metrics.context';
export { ChartScaleGroup } from './context/chart-scale';
export { ChartLegendProvider } from './context/chart-legend';

// Export types
export type {
  FilterState,
  FilterValue,
  QueryBuilderFunction,
  QueryBuilderContext,
} from './types/metrics.type';

// Export enhanced hooks
export {
  usePrometheusChart,
  usePrometheusCard,
  usePrometheusAPIQuery,
  usePrometheusLabels,
} from './hooks';

// Export query builder utilities
export {
  buildPrometheusLabelSelector,
  buildRateQuery,
  buildHistogramQuantileQuery,
  createRegionFilter,
} from './utils/query-builders';
export type { PrometheusLabelFilter, PrometheusQueryBuilderOptions } from './utils/query-builders';
export {
  buildTimeAxisTicks,
  buildUniformYTicks,
  formatChartTimeTick,
  formatReqPerSecTick,
  getChartDataMax,
  getLinearYAxisScale,
  getLinearYDomain,
  padDataToTimeRange,
  resolveChartStep,
  autoStepForRange,
  sanitizeGradientId,
  toChartLabelDate,
} from './utils/chart-axis';
