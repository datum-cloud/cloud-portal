/**
 * Metrics module exports
 */

// Constants
export * from './constants';

// Export components
export { MetricCard } from './components/MetricCard';
export { MetricChart } from './components/MetricChart';
export { MetricsToolbar } from './components/MetricsToolbar';
export { MetricsToolbar as MetricsControls } from './components/MetricsToolbar'; // Alias for backward compatibility
export { MetricsFilter } from './components/filters/MetricsFilter';
export { MetricChartTooltipContent } from './components';

// Export individual filter components
export { MetricsFilterSelect } from './components/filters/MetricsFilterSelect';
export { MetricsFilterRadio } from './components/filters/MetricsFilterRadio';
export { MetricsFilterSearch } from './components/filters/MetricsFilterSearch';

// Export provider and hooks
export { MetricsProvider, useMetrics } from './context/metrics.context';

// Export types
export type {
  FilterState,
  FilterValue,
  QueryBuilderFunction,
  QueryBuilderContext,
} from './types/metrics.type';

// Export enhanced hooks
export { usePrometheusChart, usePrometheusCard } from './hooks';
