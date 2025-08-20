/**
 * Hook for making Prometheus queries through the API middleware
 */
import { prometheusQueryKeys } from '../common';
import { useMetrics } from '../context';
import {
  type FormattedMetricData,
  type MetricCardData,
  type MetricFormat,
  type PrometheusQueryOptions,
  type TimeRange,
  PrometheusError,
} from '@/modules/prometheus';
import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';

// #region API Layer
// =======================================================================================

interface PrometheusAPIRequest {
  type: 'chart' | 'card' | 'connection' | 'buildinfo';
  query?: string;
  timeRange?: TimeRange;
  step?: string;
  metricFormat?: MetricFormat;
}

interface PrometheusAPIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  type?: string;
  details?: unknown;
}

async function makePrometheusAPIRequest<T>(request: PrometheusAPIRequest): Promise<T> {
  const response = await fetch('/api/prometheus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data: PrometheusAPIResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    throw new PrometheusError(
      data.error || 'API request failed',
      (data.type as PrometheusError['type']) || 'network',
      response.status,
      typeof data.details === 'string' ? data.details : JSON.stringify(data.details)
    );
  }

  return data.data;
}

// #endregion

// #region Generic Query Hook
// =======================================================================================

/**
 * Generic hook for all Prometheus API queries to consolidate TanStack Query options.
 */
function usePrometheusAPIQuery<T>(
  queryKey: QueryKey,
  request: PrometheusAPIRequest,
  options: { enabled?: boolean }
): UseQueryResult<T, PrometheusError> {
  return useQuery<T, PrometheusError>({
    queryKey,
    queryFn: () => makePrometheusAPIRequest<T>(request),
    enabled: options.enabled,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: (failureCount: number, error: PrometheusError) => {
      if (error.type === 'query') return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// #endregion

// #region Specific Hooks
// =======================================================================================

/**
 * Hook for Prometheus chart queries via API
 */
export function usePrometheusChart(options: Omit<PrometheusQueryOptions, 'refetchInterval'>) {
  const { query, timeRange, step, enabled = true } = options;
  const { lastRefreshed } = useMetrics();
  return usePrometheusAPIQuery<FormattedMetricData>(
    prometheusQueryKeys.chart({ query, timeRange, step, lastRefreshed }),
    { type: 'chart', query, timeRange, step },
    { enabled: enabled && !!query }
  );
}

/**
 * Hook for Prometheus card queries via API
 */
export function usePrometheusCard(
  options: Omit<PrometheusQueryOptions, 'refetchInterval'> & { metricFormat?: MetricFormat }
) {
  const { query, timeRange, metricFormat = 'number', enabled = true } = options;
  const { lastRefreshed } = useMetrics();
  return usePrometheusAPIQuery<MetricCardData>(
    prometheusQueryKeys.card({ query, timeRange, metricFormat, lastRefreshed }),
    { type: 'card', query, timeRange, metricFormat },
    { enabled: enabled && !!query }
  );
}

/**
 * Hook for Prometheus connection status
 */
export function usePrometheusConnection() {
  return usePrometheusAPIQuery<{ connected: boolean }>(
    prometheusQueryKeys.connections(),
    { type: 'connection' },
    { enabled: true }
  );
}

/**
 * Hook for Prometheus build info
 */
export function usePrometheusBuildInfo() {
  return usePrometheusAPIQuery<Record<string, string>>(
    prometheusQueryKeys.buildInfo(),
    { type: 'buildinfo' },
    { enabled: true }
  );
}

// #endregion
