/**
 * Type definitions for Prometheus integration
 */

export interface PrometheusConfig {
  readonly baseURL: string;
  readonly timeout: number;
  readonly retries: number;
  readonly headers?: Record<string, string>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface PrometheusQueryOptions {
  query: string;
  timeRange?: TimeRange;
  step?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface PrometheusInstantQueryParams {
  query: string;
  time?: string; // RFC3339 or Unix timestamp
}

export interface PrometheusRangeQueryParams {
  query: string;
  start: Date; // Parsed from RFC3339 string or Unix timestamp
  end: Date; // Parsed from RFC3339 string or Unix timestamp
  step: string; // Duration string (e.g., '15s', '1m', '5m')
}

export interface PrometheusRangeQueryRawParams {
  query: string;
  start: string; // RFC3339 or Unix timestamp string
  end: string; // RFC3339 or Unix timestamp string
  step: string; // Duration string (e.g., '15s', '1m', '5m')
}

export type PrometheusMetricValue = [number, string]; // [timestamp, value] tuple

export interface PrometheusMetric {
  metric: Record<string, string>; // Label key-value pairs
  value?: PrometheusMetricValue; // For instant queries
  values?: PrometheusMetricValue[]; // For range queries
}

export interface PrometheusQueryResult {
  resultType: 'matrix' | 'vector' | 'scalar' | 'string';
  result: PrometheusMetric[];
}

export interface PrometheusResponse {
  status: 'success' | 'error';
  data?: PrometheusQueryResult;
  error?: string;
  errorType?: string;
  warnings?: string[];
}

export interface PrometheusInstantResponse extends PrometheusResponse {
  data: PrometheusQueryResult;
}

export interface PrometheusRangeResponse extends PrometheusResponse {
  data: PrometheusQueryResult;
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  formattedTime: string;
  labels?: Record<string, string>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  labels: Record<string, string>;
}

export interface FormattedMetricData {
  series: ChartSeries[];
  timeRange: {
    start: number;
    end: number;
  };
}

export interface MetricCardData {
  value: number;
  formattedValue: string;
  timestamp: number;
  labels?: Record<string, string>;
  change?: {
    value: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export type ChartType = 'line' | 'area' | 'bar' | 'gauge';

export type MetricFormat =
  | 'number'
  | 'bytes'
  | 'percent'
  | 'percent-hundred'
  | 'seconds'
  | 'requestsPerSecond'
  | 'milliseconds'
  | 'milliseconds-auto'
  | 'duration'
  | 'rate'
  | 'short-number';

export interface QueryBuilderOptions {
  metric: string;
  filters?: Record<string, string>;
  functions?: string[];
  groupBy?: string[];
  aggregation?: 'sum' | 'avg' | 'max' | 'min' | 'count';
}

export interface PrometheusError extends Error {
  type: 'network' | 'query' | 'timeout' | 'unknown';
  statusCode?: number;
  details?: string;
}
