/**
 * Single metric display card component
 */
import { BaseMetric } from '@/modules/metrics/components/base-metric';
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import { usePrometheusCard } from '@/modules/metrics/hooks';
import type { QueryBuilderFunction } from '@/modules/metrics/types/url.type';
import type { CustomApiParams } from '@/modules/metrics/types/url.type';
import {
  formatValue,
  type MetricCardData,
  type MetricFormat,
  type PrometheusQueryOptions,
} from '@/modules/prometheus';
import { cn } from '@/utils/common';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import React, { useMemo } from 'react';

export interface MetricCardProps
  extends Omit<PrometheusQueryOptions, 'query' | 'timeRange' | 'step'> {
  /**
   * Prometheus query - can be a string or query builder function
   */
  query: string | QueryBuilderFunction;

  /**
   * Custom API parameters for this card.
   * Can be an object or a function that receives the query builder context.
   * These parameters will be merged with core controls (timeRange, step).
   */
  customApiParams?: CustomApiParams;

  /**
   * Card title
   */
  title?: string;

  /**
   * Card description
   */
  description?: string;

  /**
   * Value format
   */
  metricFormat?: MetricFormat;

  /**
   * Value suffix (e.g., 'req/s', 'ms')
   */
  suffix?: string;

  /**
   * Number precision for display
   */
  precision?: number;

  /**
   * Error callback
   */
  onError?: (error: Error) => void;

  /**
   * Success callback
   */
  onSuccess?: (data: MetricCardData) => void;

  /**
   * Show trend indicator
   */
  showTrend?: boolean;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Custom icon - can be a component type or JSX element
   * @example icon={Activity} // Component type
   * @example icon={<Activity className="h-5 w-5 text-blue-500" />} // JSX with custom styling
   */
  icon?: React.ComponentType<{ className?: string }> | React.ReactElement;
}

/**
 * MetricCard component
 */
export function MetricCard({
  query,
  customApiParams,
  enabled = true,
  title,
  description,
  metricFormat = 'number',
  suffix,
  precision = 2,
  showTrend = false,
  className,
  icon,
}: MetricCardProps) {
  const { timeRange, step, buildQueryContext, filterState } = useMetrics();

  // Resolve custom API parameters - include filterState to trigger re-evaluation
  const resolvedApiParams = useMemo(() => {
    if (!customApiParams) return {};
    if (typeof customApiParams === 'function') {
      return customApiParams(buildQueryContext());
    }
    return customApiParams;
  }, [customApiParams, buildQueryContext, filterState]);

  // Extract timeRange and step from custom params or use defaults
  const finalTimeRange = useMemo(() => {
    if (resolvedApiParams.timeRange) {
      // If customApiParams specifies a timeRange key, get it from URL state
      const context = buildQueryContext();
      return context.getTimeRange(resolvedApiParams.timeRange);
    }
    return timeRange;
  }, [resolvedApiParams.timeRange, timeRange, buildQueryContext, filterState]);

  const finalStep = useMemo(() => {
    if (resolvedApiParams.step) {
      // If customApiParams specifies a step key, get it from URL state
      const context = buildQueryContext();
      return context.getStep(resolvedApiParams.step);
    }
    return step;
  }, [resolvedApiParams.step, step, buildQueryContext, filterState]);

  // Build the final query string
  const finalQuery = useMemo(() => {
    if (typeof query === 'string') {
      return query;
    }
    // Use enhanced context directly
    const context = buildQueryContext();
    return query(context);
  }, [query, buildQueryContext, filterState]);

  // Filter out timeRange and step from resolvedApiParams to avoid conflicts
  const additionalApiParams = useMemo(() => {
    const { timeRange: _, step: __, ...rest } = resolvedApiParams;
    return rest;
  }, [resolvedApiParams]);

  const { data, isLoading, isFetching, error } = usePrometheusCard({
    query: finalQuery,
    timeRange: finalTimeRange,
    step: finalStep,
    enabled,
    metricFormat,
    ...additionalApiParams, // Spread additional API parameters (excluding timeRange/step)
  });

  const formattedValue = useMemo(() => {
    if (!data) return '—';
    let formatted = formatValue(data.value, metricFormat, precision);
    if (suffix) {
      formatted += ` ${suffix}`;
    }
    return formatted;
  }, [data, metricFormat, precision, suffix]);

  const trendIcon = useMemo(() => {
    if (!showTrend || !data?.change) return null;
    const { trend } = data.change;
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  }, [showTrend, data?.change]);

  const trendText = useMemo(() => {
    if (!showTrend || !data?.change) return null;
    const { percentage, trend } = data.change;
    const sign = trend === 'up' ? '+' : trend === 'down' ? '-' : '';
    return `${sign}${Math.abs(percentage).toFixed(1)}%`;
  }, [showTrend, data?.change]);

  const IconComponent = icon
    ? React.isValidElement(icon)
      ? icon
      : React.createElement(icon as React.ComponentType<{ className?: string }>, {
          className: 'text-muted-foreground h-4 w-4',
        })
    : null;

  return (
    <BaseMetric
      title={title}
      description={description}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      className={cn('MetricCard', className)}
      isEmpty={!data}>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">{formattedValue}</div>
        {IconComponent}
      </div>

      {showTrend && trendIcon && trendText && (
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          {trendIcon}
          <span>{trendText}</span>
          <span>from last period</span>
        </div>
      )}
      {data?.timestamp && (
        <div className="text-muted-foreground text-xs">
          Updated {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </BaseMetric>
  );
}
