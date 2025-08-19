/**
 * Generic metric chart component using Recharts
 */
import { MetricLoaderWrapper } from './common/MetricLoaderWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePrometheusChart } from '@/modules/metrics/hooks';
import {
  formatValue,
  transformForRecharts,
  type ChartType,
  type MetricFormat,
  type PrometheusQueryOptions,
} from '@/modules/prometheus';
import { cn } from '@/utils/common';
import { Minus } from 'lucide-react';
import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface MetricChartProps extends PrometheusQueryOptions {
  /**
   * Chart title
   */
  title?: string;

  /**
   * Chart description
   */
  description?: string;

  /**
   * Chart type
   */
  chartType?: ChartType;

  /**
   * Chart height in pixels
   */
  height?: number;

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
  onSuccess?: (data: any) => void;

  /**
   * Show legend
   */
  showLegend?: boolean;

  /**
   * Show tooltip
   */
  showTooltip?: boolean;

  /**
   * Custom colors for series
   */
  colors?: string[];

  /**
   * Value format for tooltip and axis
   */
  valueFormat?: MetricFormat;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Card variant
   */
  variant?: 'default' | 'secondary' | 'destructive';
}

/**
 * MetricChart component
 */
export function MetricChart({
  query,
  timeRange,
  step,
  enabled = true,
  refetchInterval,
  queryKey,
  title,
  description,
  chartType = 'line',
  height = 300,
  showLegend = true,
  showTooltip = true,
  colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'],
  valueFormat = 'number',
  className,
  variant = 'default',
  onError,
  onSuccess,
}: MetricChartProps) {
  const { data, isLoading, error } = usePrometheusChart({
    query,
    timeRange,
    step,
    enabled,
    refetchInterval,
  });

  const chartData = React.useMemo(() => {
    if (!data || data.isEmpty) return [];
    return transformForRecharts(data);
  }, [data]);

  const seriesNames = React.useMemo(() => {
    if (!data || data.isEmpty) return [];
    return data.series.map((series) => series.name);
  }, [data]);

  const seriesColors = React.useMemo(() => {
    if (!data || data.isEmpty) return colors;
    return data.series.map((series) => series.color || '#8884d8');
  }, [data, colors]);

  const formatTooltipValue = React.useCallback(
    (value: number) => {
      return formatValue(value, valueFormat);
    },
    [valueFormat]
  );

  const formatAxisValue = React.useCallback(
    (value: number) => {
      return formatValue(value, valueFormat, 1);
    },
    [valueFormat]
  );

  const formatXAxisValue = React.useCallback((tickItem: number) => {
    const date = new Date(tickItem);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const xAxisProps = {
      dataKey: 'timestamp',
      type: 'number' as const,
      scale: 'time' as const,
      domain: ['dataMin', 'dataMax'],
      tickFormatter: formatXAxisValue,
      tick: { fontSize: 10 },
    };

    const yAxisProps = {
      tickFormatter: formatAxisValue,
      tickSize: 2,
      domain: ['dataMin', 'dataMax'],
      tick: { fontSize: 10 },
    };

    const tooltipProps = showTooltip
      ? {
          labelFormatter: (value: number) => new Date(value).toLocaleString(),
          formatter: (value: number) => [formatTooltipValue(value), ''],
          itemStyle: { fontSize: 12 },
          labelStyle: { fontSize: 12, fontWeight: 'bold' },
        }
      : undefined;

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {seriesNames.map((name, index) => (
              <Area
                key={name}
                type="monotone"
                dataKey={name}
                stroke={seriesColors[index]}
                fill={seriesColors[index]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {seriesNames.map((name, index) => (
              <Bar key={name} dataKey={name} fill={seriesColors[index]} />
            ))}
          </BarChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip {...tooltipProps} />}
            {showLegend && <Legend />}
            {seriesNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={seriesColors[index]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <MetricLoaderWrapper
      isLoading={isLoading}
      error={error}
      title={title}
      className={className}
      height={height}>
      <Card className={cn(className)} data-variant={variant}>
        <CardHeader>
          {title && (
            <CardTitle className="flex items-center gap-2">
              {title}
              {isLoading && <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />}
            </CardTitle>
          )}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          {data && !data.isEmpty ? (
            <ResponsiveContainer width="100%" height={height}>
              {renderChart()}
            </ResponsiveContainer>
          ) : (
            <div
              className="text-muted-foreground flex items-center justify-center"
              style={{ height }}>
              <div className="text-center">
                <Minus className="mx-auto mb-2 h-8 w-8" />
                <p>No data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </MetricLoaderWrapper>
  );
}
