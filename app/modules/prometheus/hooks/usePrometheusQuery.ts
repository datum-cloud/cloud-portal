/**
 * React hook for Prometheus queries using TanStack Query
 */
import { PrometheusError } from '../errors';
import { prometheusService } from '../service';
import type {
  FormattedMetricData,
  MetricCardData,
  MetricFormat,
  PrometheusQueryOptions,
} from '../types';
import { validateQueryOptions } from '../validator';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

export interface UsePrometheusQueryOptions<
  T extends FormattedMetricData | MetricCardData = FormattedMetricData | MetricCardData,
> extends PrometheusQueryOptions {
  /**
   * Query key suffix for cache management
   */
  queryKey?: string[];

  /**
   * Return format - 'chart' for time series data, 'card' for single values
   */
  format?: 'chart' | 'card';

  /**
   * Metric format for card display
   */
  metricFormat?: MetricFormat;

  /**
   * Custom error handler
   */
  onError?: (error: PrometheusError) => void;

  /**
   * Custom success handler
   */
  onSuccess?: (data: T) => void;
}

export interface UsePrometheusQueryResult<
  T extends FormattedMetricData | MetricCardData = FormattedMetricData | MetricCardData,
> {
  /**
   * The query data
   */
  data: T | undefined;

  /**
   * Whether the query is loading
   */
  isLoading: boolean;

  /**
   * Whether the query is currently fetching
   */
  isFetching: boolean;

  /**
   * Whether this is the first fetch
   */
  isInitialLoading: boolean;

  /**
   * Query error if any
   */
  error: PrometheusError | null;

  /**
   * Query status
   */
  status: 'pending' | 'error' | 'success';

  /**
   * Refetch the query
   */
  refetch: () => Promise<any>;

  /**
   * Whether the query is enabled
   */
  isEnabled: boolean;
}

/**
 * Hook for querying Prometheus metrics
 */
export function usePrometheusQuery<
  T extends FormattedMetricData | MetricCardData = FormattedMetricData | MetricCardData,
>(options: UsePrometheusQueryOptions<T>): UsePrometheusQueryResult<T> {
  const {
    query,
    timeRange,
    step,
    enabled = true,
    refetchInterval,
    queryKey = [],
    format = 'chart',
    metricFormat = 'number',
  } = options;

  // Validate options
  const validatedOptions = validateQueryOptions({
    query,
    timeRange,
    step,
    enabled,
    refetchInterval,
  });

  // Build query key for caching
  const fullQueryKey = [
    'prometheus',
    format,
    query,
    timeRange
      ? {
          start: timeRange.start.getTime(),
          end: timeRange.end.getTime(),
        }
      : null,
    step,
    metricFormat,
    ...queryKey,
  ];

  const queryResult = useQuery({
    queryKey: fullQueryKey,
    queryFn: async (): Promise<T> => {
      try {
        if (format === 'card') {
          const result = await prometheusService.queryForCard(
            validatedOptions.query,
            metricFormat,
            timeRange?.end
          );
          return result as T;
        } else {
          const result = await prometheusService.queryForChart(validatedOptions);
          return result as T;
        }
      } catch (error) {
        if (error instanceof PrometheusError) {
          throw error;
        }
        throw PrometheusError.unknown(
          error instanceof Error ? error.message : 'Unknown query error'
        );
      }
    },
    enabled: enabled && !!query,
    refetchInterval: refetchInterval || false,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: (failureCount: number, error: Error) => {
      // Don't retry on query validation errors
      if (error instanceof PrometheusError && error.type === 'query') {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    data: queryResult.data as T | undefined,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    isInitialLoading: queryResult.isLoading && queryResult.fetchStatus !== 'idle',
    error: queryResult.error as PrometheusError | null,
    status: queryResult.status,
    refetch: queryResult.refetch,
    isEnabled: queryResult.isEnabled,
  };
}

/**
 * Hook specifically for chart data
 */
export function usePrometheusChart(
  options: Omit<UsePrometheusQueryOptions, 'format' | 'metricFormat'>
): UsePrometheusQueryResult<FormattedMetricData> {
  return usePrometheusQuery<FormattedMetricData>({
    ...options,
    format: 'chart',
  });
}

/**
 * Hook specifically for metric card data
 */
export function usePrometheusCard(
  options: Omit<UsePrometheusQueryOptions, 'format'> & {
    metricFormat?: MetricFormat;
  }
): UsePrometheusQueryResult<MetricCardData> {
  return usePrometheusQuery<MetricCardData>({
    ...options,
    format: 'card',
  });
}

/**
 * Hook for multiple queries (batch)
 */
export function usePrometheusQueries(
  queries: Array<UsePrometheusQueryOptions & { id: string }>
): Record<string, UsePrometheusQueryResult> {
  const results: Record<string, UsePrometheusQueryResult> = {};

  for (const queryConfig of queries) {
    const { id, ...options } = queryConfig;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[id] = usePrometheusQuery({
      ...options,
      queryKey: [id, ...(options.queryKey || [])],
    });
  }

  return results;
}

/**
 * Hook for real-time metrics with automatic refresh
 */
export function useRealtimeMetrics(
  options: UsePrometheusQueryOptions & {
    refreshInterval?: number;
    autoRefresh?: boolean;
  }
): UsePrometheusQueryResult & {
  isRealtime: boolean;
  toggleRealtime: () => void;
} {
  const { refreshInterval = 30000, autoRefresh = true, ...queryOptions } = options;

  const [isRealtime, setIsRealtime] = React.useState(autoRefresh);

  const queryResult = usePrometheusQuery({
    ...queryOptions,
    refetchInterval: isRealtime ? refreshInterval : undefined,
  });

  const toggleRealtime = React.useCallback(() => {
    setIsRealtime((prev) => !prev);
  }, []);

  return {
    ...queryResult,
    isRealtime,
    toggleRealtime,
  };
}
