/**
 * Runs a metrics request against queryapi and formats the result for the
 * charts and cards. Pure apart from the injected service, so it is testable
 * without the shared control-plane client.
 */
import { resolveChartStep } from '@/modules/metrics/utils/chart-axis';
import {
  type FormattedMetricData,
  type MetricCardData,
  type MetricFormat,
  type TimeRange,
  PrometheusError,
} from '@/modules/prometheus';
import { QueryValidationError } from '@/modules/prometheus/errors';
import { formatForCard, formatForChart } from '@/modules/prometheus/formatter';
import { timeRangeToUnix, validateQueryOptions } from '@/modules/prometheus/validator';
import type { O11yMetricsService } from '@/resources/o11y-metrics';
import { AppError } from '@/utils/errors';

export interface PrometheusAPIRequest {
  type: 'chart' | 'card' | 'labels';
  /** Project whose metrics to read. queryapi scopes every query to it. */
  projectId: string;
  query?: string;
  timeRange?: TimeRange | { start: number; end: number }; // Accept both Date objects and timestamps
  step?: string;
  metricFormat?: MetricFormat;
  label?: string; // For labels API calls
  match?: string; // For labels API: series selector to scope label values
  // Additional API parameters for custom configurations
  [key: string]: any;
}

export type PrometheusRequestService = Pick<
  O11yMetricsService,
  'query' | 'queryRange' | 'labelValues'
>;

/**
 * Converts any failure on the metrics path into a `PrometheusError`, keeping
 * the HTTP status so the UI can tell permission, size and timeout failures
 * apart.
 */
export function toPrometheusError(error: unknown): PrometheusError {
  if (error instanceof PrometheusError) return error;

  if (error instanceof QueryValidationError) {
    return PrometheusError.query(error.message, error.field);
  }

  if (error instanceof AppError) {
    const { status, message } = error;
    // 400 is a malformed query (or an error envelope); 422 is a response too large.
    if (status === 400 || status === 422) return new PrometheusError(message, 'query', status);
    if (status === 503 || status === 504) return new PrometheusError(message, 'timeout', status);
    return PrometheusError.network(message, status);
  }

  return PrometheusError.unknown(error instanceof Error ? error.message : 'Unknown metrics error');
}

const MAX_METRICS_RETRIES = 3;

/**
 * Permission failures, bad queries and timeouts won't change on retry, and
 * retrying a timed-out query only reruns the same expensive work in queryapi.
 */
export function shouldRetryMetricsQuery(failureCount: number, error: PrometheusError): boolean {
  if (error.type === 'query' || error.type === 'timeout') return false;
  if (error.statusCode === 401 || error.statusCode === 403) return false;
  return failureCount < MAX_METRICS_RETRIES;
}

const toTimeRangeInput = (
  timeRange: PrometheusAPIRequest['timeRange']
): { start: number; end: number } | undefined =>
  timeRange && timeRange.start instanceof Date && timeRange.end instanceof Date
    ? timeRangeToUnix(timeRange as TimeRange)
    : (timeRange as { start: number; end: number } | undefined);

async function runChart(
  request: PrometheusAPIRequest,
  service: PrometheusRequestService
): Promise<FormattedMetricData> {
  const options = validateQueryOptions({
    query: request.query,
    timeRange: toTimeRangeInput(request.timeRange),
    step: request.step,
  });

  if (!options.timeRange) {
    const response = await service.query({ projectId: request.projectId, query: options.query });
    return formatForChart(response.data);
  }

  const range = timeRangeToUnix(options.timeRange);
  const step = resolveChartStep(options.step, (range.end - range.start) * 1000);
  const response = await service.queryRange({
    projectId: request.projectId,
    query: options.query,
    ...range,
    step,
  });
  return formatForChart(response.data, range);
}

async function runCard(
  request: PrometheusAPIRequest,
  service: PrometheusRequestService
): Promise<MetricCardData> {
  const options = validateQueryOptions({
    query: request.query,
    timeRange: toTimeRangeInput(request.timeRange),
  });

  const response = await service.query({
    projectId: request.projectId,
    query: options.query,
    time: options.timeRange ? timeRangeToUnix(options.timeRange).end : undefined,
  });
  return formatForCard(response.data, request.metricFormat ?? 'number');
}

const runLabels = (
  request: PrometheusAPIRequest,
  service: PrometheusRequestService
): Promise<string[]> =>
  service.labelValues({
    projectId: request.projectId,
    label: request.label ?? '',
    match: request.match,
  });

export async function executePrometheusRequest<T>(
  request: PrometheusAPIRequest,
  service: PrometheusRequestService
): Promise<T> {
  try {
    switch (request.type) {
      case 'chart':
        return (await runChart(request, service)) as T;
      case 'card':
        return (await runCard(request, service)) as T;
      case 'labels':
        return (await runLabels(request, service)) as T;
      default:
        throw PrometheusError.query(`Unsupported query type: ${String(request.type)}`);
    }
  } catch (error) {
    throw toPrometheusError(error);
  }
}
