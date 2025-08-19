/**
 * Prometheus module exports
 */

// Core types
export type {
  PrometheusConfig,
  TimeRange,
  PrometheusQueryOptions,
  PrometheusInstantQueryParams,
  PrometheusRangeQueryParams,
  PrometheusMetricValue,
  PrometheusMetric,
  PrometheusQueryResult,
  PrometheusResponse,
  PrometheusInstantResponse,
  PrometheusRangeResponse,
  ChartDataPoint,
  ChartSeries,
  FormattedMetricData,
  MetricCardData,
  ChartType,
  MetricFormat,
  QueryBuilderOptions,
} from './types';

// Error classes
export { PrometheusError, QueryValidationError, ChartDataError } from './errors';

// Validation utilities
export {
  validateQueryOptions,
  validateInstantQueryParams,
  validateRangeQueryParams,
  validateQueryBuilderOptions,
  validateTimeRange,
  sanitizeQuery,
  timeRangeToUnix,
  timeRangeToRFC3339,
  parseDuration,
} from './validator';

// Client utilities
export {
  createPrometheusClient,
  executeInstantQuery,
  executeRangeQuery,
  testConnection,
  getBuildInfo,
  PROMETHEUS_CONFIG,
} from './client';

// Query builder
export { PrometheusQueryBuilder, PromQLUtils } from './query-builder';

// Data formatting
export { formatForChart, formatForCard, formatValue, transformForRecharts } from './formatter';

// Query templates
export { CommonTemplates, type TemplateParams } from './templates';

// Main service
export { PrometheusService, prometheusService } from './service';

// React Hooks
export {
  usePrometheusQuery,
  usePrometheusChart,
  usePrometheusCard,
  usePrometheusQueries,
  useRealtimeMetrics,
  type UsePrometheusQueryOptions,
  type UsePrometheusQueryResult,
} from './hooks/usePrometheusQuery';
