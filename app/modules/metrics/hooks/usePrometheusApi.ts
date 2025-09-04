/**
 * Enhanced hook for making Prometheus queries through the API middleware
 * Supports dynamic query building with filters and enhanced metrics context
 */
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import type {
  QueryBuilderFunction,
  QueryBuilderContext,
} from '@/modules/metrics/types/metrics.type';
import { parseDurationToMs } from '@/modules/metrics/utils/date-parsers';
import {
  type FormattedMetricData,
  type MetricCardData,
  type MetricFormat,
  type PrometheusQueryOptions,
  type TimeRange,
  PrometheusError,
} from '@/modules/prometheus';
import { ROUTE_PATH as PROMETHEUS_ROUTE_PATH } from '@/routes/api/prometheus';
import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import React from 'react';

const prometheusQueryKeys = {
  all: ['prometheus-api'] as const,
  charts: () => [...prometheusQueryKeys.all, 'charts'] as const,
  chart: (options: PrometheusQueryOptions) =>
    [
      ...prometheusQueryKeys.charts(),
      options.query,
      options.timeRange?.start.getTime(),
      options.timeRange?.end.getTime(),
      options.step,
    ] as const,
  cards: () => [...prometheusQueryKeys.all, 'cards'] as const,
  card: (options: PrometheusQueryOptions & { metricFormat?: MetricFormat }) =>
    [
      ...prometheusQueryKeys.cards(),
      options.query,
      options.timeRange?.start.getTime(),
      options.timeRange?.end.getTime(),
      options.metricFormat,
    ] as const,
  connections: () => [...prometheusQueryKeys.all, 'connections'] as const,
  buildInfo: () => [...prometheusQueryKeys.all, 'build-info'] as const,
  labels: () => [...prometheusQueryKeys.all, 'labels'] as const,
  label: (labelName: string) => [...prometheusQueryKeys.labels(), labelName] as const,
};

// #region API Layer
// =======================================================================================

interface PrometheusAPIRequest {
  type: 'chart' | 'card' | 'connection' | 'buildinfo' | 'labels';
  query?: string;
  timeRange?: TimeRange;
  step?: string;
  metricFormat?: MetricFormat;
  label?: string; // For labels API calls
  // Additional API parameters for custom configurations
  [key: string]: any;
}

interface PrometheusAPIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  type?: string;
  details?: unknown;
}

async function makePrometheusAPIRequest<T>(request: PrometheusAPIRequest): Promise<T> {
  const response = await fetch(PROMETHEUS_ROUTE_PATH, {
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
export function usePrometheusAPIQuery<T>(
  queryKey: QueryKey,
  request: PrometheusAPIRequest,
  options: { enabled?: boolean; refetchInterval?: number | false }
): UseQueryResult<T, PrometheusError> {
  return useQuery<T, PrometheusError>({
    queryKey,
    queryFn: () => makePrometheusAPIRequest<T>(request),
    enabled: options.enabled,
    refetchInterval: options.refetchInterval,
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

// #region Query Resolution Utilities
// =======================================================================================

/**
 * Resolves a query string or function into an actual query string
 */
function resolveQuery(query: string | QueryBuilderFunction, context: QueryBuilderContext): string {
  if (typeof query === 'string') {
    return query;
  }
  return query(context);
}

/**
 * Creates a stable query key that includes resolved query and filter state
 */
function createQueryKey(
  baseKey: readonly unknown[],
  query: string | QueryBuilderFunction,
  context: QueryBuilderContext,
  additionalParams?: Record<string, unknown>
): QueryKey {
  const resolvedQuery = resolveQuery(query, context);
  const filterHash = JSON.stringify(context.state);

  return [
    ...baseKey,
    resolvedQuery,
    context.timeRange.start.getTime(),
    context.timeRange.end.getTime(),
    context.step,
    filterHash,
    ...(additionalParams ? Object.values(additionalParams) : []),
  ] as const;
}

// #endregion

// #region Enhanced Hooks
// =======================================================================================

/**
 * Enhanced hook for Prometheus chart queries with dynamic query building
 */
export function usePrometheusChart(
  options: Omit<PrometheusQueryOptions, 'refetchInterval'> & {
    query: string | QueryBuilderFunction;
    [key: string]: any; // Allow additional API parameters
  }
) {
  const {
    query,
    timeRange: optionsTimeRange,
    step: optionsStep,
    enabled = true,
    ...additionalParams
  } = options;
  const metricsContext = useMetrics();
  const { refreshInterval, buildQueryContext } = metricsContext;

  // Direct URL state access for reactivity
  const [urlTimeRange] = useQueryState('timeRange');
  const [urlStep] = useQueryState('step');

  // Use context values if not provided in options
  const queryContext = React.useMemo(() => {
    const context = buildQueryContext();
    return {
      ...context,
      timeRange: optionsTimeRange || context.timeRange,
      step: optionsStep || context.step,
    };
  }, [buildQueryContext, optionsTimeRange, optionsStep, urlTimeRange, urlStep]);

  const resolvedQuery = React.useMemo(() => {
    return resolveQuery(query, queryContext);
  }, [query, queryContext]);

  const refetchMs = React.useMemo(() => {
    if (refreshInterval === 'off') return false;
    return parseDurationToMs(refreshInterval) ?? false;
  }, [refreshInterval]);

  const queryKey = React.useMemo(() => {
    return createQueryKey(prometheusQueryKeys.charts(), query, queryContext, additionalParams);
  }, [query, queryContext, additionalParams]);

  return usePrometheusAPIQuery<FormattedMetricData>(
    queryKey,
    {
      type: 'chart',
      query: resolvedQuery,
      timeRange: queryContext.timeRange,
      step: queryContext.step,
      ...additionalParams, // Include additional API parameters
    },
    { enabled: enabled && !!resolvedQuery, refetchInterval: refetchMs }
  );
}

/**
 * Enhanced hook for Prometheus card queries with dynamic query building
 */
export function usePrometheusCard(
  options: Omit<PrometheusQueryOptions, 'refetchInterval' | 'step'> & {
    query: string | QueryBuilderFunction;
    metricFormat?: MetricFormat;
    [key: string]: any; // Allow additional API parameters
  }
) {
  const {
    query,
    timeRange: optionsTimeRange,
    metricFormat = 'number',
    enabled = true,
    ...additionalParams
  } = options;
  const metricsContext = useMetrics();
  const { refreshInterval, buildQueryContext } = metricsContext;

  // Direct URL state access for reactivity
  const [urlTimeRange] = useQueryState('timeRange');

  // Use context values if not provided in options
  const queryContext = React.useMemo(() => {
    const context = buildQueryContext();
    return {
      ...context,
      timeRange: optionsTimeRange || context.timeRange,
    };
  }, [buildQueryContext, optionsTimeRange, urlTimeRange]);

  const resolvedQuery = React.useMemo(() => {
    return resolveQuery(query, queryContext);
  }, [query, queryContext]);

  const refetchMs = React.useMemo(() => {
    if (refreshInterval === 'off') return false;
    return parseDurationToMs(refreshInterval) ?? false;
  }, [refreshInterval]);

  const queryKey = React.useMemo(() => {
    return createQueryKey(prometheusQueryKeys.cards(), query, queryContext, {
      metricFormat,
      ...additionalParams,
    });
  }, [query, queryContext, metricFormat, additionalParams]);

  return usePrometheusAPIQuery<MetricCardData>(
    queryKey,
    {
      type: 'card',
      query: resolvedQuery,
      timeRange: queryContext.timeRange,
      metricFormat,
      ...additionalParams, // Include additional API parameters
    },
    { enabled: enabled && !!resolvedQuery, refetchInterval: refetchMs }
  );
}
