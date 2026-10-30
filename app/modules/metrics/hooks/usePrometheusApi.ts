/**
 * Enhanced hook for making Prometheus queries through the API middleware
 * Supports dynamic query building with filters and enhanced metrics context
 */
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import type {
  QueryBuilderFunction,
  QueryBuilderContext,
} from '@/modules/metrics/types/metrics.type';
import { resolveChartStep } from '@/modules/metrics/utils/chart-axis';
import { parseDurationToMs } from '@/modules/metrics/utils/date-parsers';
import {
  executePrometheusRequest,
  shouldRetryMetricsQuery,
  type PrometheusAPIRequest,
} from '@/modules/metrics/utils/prometheus-request';
import type {
  FormattedMetricData,
  MetricCardData,
  MetricFormat,
  PrometheusError,
  PrometheusQueryOptions,
} from '@/modules/prometheus';
import { createO11yMetricsService } from '@/resources/o11y-metrics';
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

const metricsService = createO11yMetricsService();

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
    // queryapi scopes results to the project, so the cache must too.
    queryKey: [...queryKey, request.projectId],
    queryFn: () => executePrometheusRequest<T>(request, metricsService),
    enabled: options.enabled,
    refetchInterval: options.refetchInterval,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: shouldRetryMetricsQuery,
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
  const { refreshInterval, buildQueryContext, projectId } = metricsContext;

  // Direct URL state access for reactivity
  const [urlTimeRange] = useQueryState('timeRange');
  const [urlStep] = useQueryState('step');

  // Use context values if not provided in options
  const queryContext = React.useMemo(() => {
    const context = buildQueryContext();
    const timeRange = optionsTimeRange || context.timeRange;
    const rangeMs = timeRange.end.getTime() - timeRange.start.getTime();
    return {
      ...context,
      timeRange,
      step: resolveChartStep(optionsStep || context.step, rangeMs),
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
      projectId,
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
  const { refreshInterval, buildQueryContext, projectId } = metricsContext;

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
      projectId,
      query: resolvedQuery,
      timeRange: queryContext.timeRange,
      metricFormat,
      ...additionalParams, // Include additional API parameters
    },
    { enabled: enabled && !!resolvedQuery, refetchInterval: refetchMs }
  );
}
