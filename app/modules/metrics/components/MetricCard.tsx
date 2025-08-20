/**
 * Single metric display card component
 */
import { BaseMetric } from './common/BaseMetric';
import { usePrometheusCard } from '@/modules/metrics/hooks';
import {
  formatValue,
  type MetricCardData,
  type MetricFormat,
  type PrometheusQueryOptions,
} from '@/modules/prometheus';
import { cn } from '@/utils/common';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import React from 'react';

export interface MetricCardProps extends PrometheusQueryOptions {
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
   * Additional query key for caching
   */
  queryKey?: string[];

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
   * Card variant
   */
  variant?: 'default' | 'secondary' | 'destructive';

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
  timeRange,

  step,
  enabled = true,
  refetchInterval,
  queryKey,
  title,
  description,
  metricFormat = 'number',
  suffix,
  precision = 2,
  showTrend = false,
  className,
  variant = 'default',
  icon,
  onError,
  onSuccess,
}: MetricCardProps) {
  const { data, isLoading, error } = usePrometheusCard({
    query,
    timeRange,
    step,
    enabled,
    refetchInterval,
    metricFormat,
  });

  const formattedValue = React.useMemo(() => {
    if (!data) return '—';
    let formatted = formatValue(data.value, metricFormat, precision);
    if (suffix) {
      formatted += ` ${suffix}`;
    }
    return formatted;
  }, [data, metricFormat, precision, suffix]);

  const trendIcon = React.useMemo(() => {
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

  const trendText = React.useMemo(() => {
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
