/**
 * Generic metric chart component using Shadcn UI Chart components
 */
import { DateTime } from '@/components/date-time';
import { BaseMetric } from '@/modules/metrics/components/base-metric';
import { AreaSeries, BarSeries, LineSeries } from '@/modules/metrics/components/series';
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import { usePrometheusChart } from '@/modules/metrics/hooks';
import type { QueryBuilderFunction } from '@/modules/metrics/types/url.type';
import type { CustomApiParams } from '@/modules/metrics/types/url.type';
import {
  bucketDataToTimeRange,
  buildTimeAxisTicks,
  formatChartTimeTick,
  getChartDataMax,
  getLinearYAxisScale,
  sanitizeGradientId,
  type BucketAggregation,
} from '@/modules/metrics/utils/chart-axis';
import { parseDurationToMs } from '@/modules/metrics/utils/date-parsers';
import {
  formatValue,
  transformForRecharts,
  type ChartType,
  type MetricFormat,
  type PrometheusQueryOptions,
  ChartSeries,
} from '@/modules/prometheus';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@datum-cloud/datum-ui/chart';
import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { CartesianGrid, AreaChart, BarChart, LineChart, XAxis, YAxis, YAxisProps } from 'recharts';
import { TooltipContentProps } from 'recharts/types/component/Tooltip';

export interface MetricChartProps extends Omit<PrometheusQueryOptions, 'query'> {
  /**
   * Prometheus query - can be a string or query builder function
   */
  query: string | QueryBuilderFunction;
  /**
   * Custom API parameters for this chart.
   * Can be an object or a function that receives the query builder context.
   * These parameters will be merged with core controls (timeRange, step).
   */
  customApiParams?: CustomApiParams;
  title?: string;
  description?: string;
  chartType?: ChartType;
  height?: number;
  queryKey?: string[];
  onDataChange?: (data: any, chartData: any[]) => void;
  onSeriesChange?: (series: ChartSeries[]) => void;
  onQueryStateChange?: (state: {
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
  }) => void;
  showLegend?: boolean;
  showTooltip?: boolean;
  valueFormat?: MetricFormat;
  yAxisFormatter?: (value: number) => string;
  xAxisFormatter?: (value: number) => string;
  className?: string;
  yAxisOptions?: YAxisProps;
  tooltipContent?: (props: TooltipContentProps<any, any>) => ReactNode;
  /**
   * Override colors for specific series by name. Values can be CSS variable strings
   * like 'var(--primary)' or hex/hsl values.
   */
  colorOverrides?: Record<string, string>;
  /**
   * When true, fix the X-axis domain to the active time range and pad the data
   * with zero-valued points at every step interval. Use for charts that should
   * always span the selected window (e.g., WAF events). Defaults to false so
   * sparkline-style charts auto-fit to their data.
   */
  padToTimeRange?: boolean;
  /**
   * Recharts syncId — when set, tooltip/cursor sync across charts sharing the same id.
   */
  syncId?: string;
  /** Hide X-axis ticks while keeping the time domain (use on upper rows of synced groups). */
  hideXAxis?: boolean;
  /** Stack bar series at each timestamp (bar charts only). */
  stackBars?: boolean;
  /**
   * Children to render below the chart
   */
  children?: ReactNode;
}

const CustomTooltip = ({ labelFormatter, ...props }: any) => {
  return <ChartTooltipContent labelFormatter={labelFormatter} {...props} />;
};

export function MetricChart({
  query,
  customApiParams,
  enabled = true,
  title,
  description,
  chartType = 'line',
  height = 300,
  onDataChange,
  onSeriesChange,
  onQueryStateChange,
  showLegend = true,
  showTooltip = true,
  valueFormat = 'number',
  yAxisFormatter,
  xAxisFormatter,
  className,
  yAxisOptions,
  tooltipContent,
  colorOverrides,
  padToTimeRange = false,
  syncId,
  hideXAxis = false,
  stackBars = false,
  children,
}: MetricChartProps) {
  const { timeRange, step, buildQueryContext, filterState } = useMetrics();

  // Resolve custom API parameters - include filterState in dependencies to trigger re-evaluation
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

  // Build the final query string - include filterState to trigger re-evaluation
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
  }, [resolvedApiParams, filterState]);

  const { data, isLoading, isFetching, error } = usePrometheusChart({
    query: finalQuery,
    timeRange: finalTimeRange,
    step: finalStep,
    enabled,
    ...additionalApiParams, // Spread additional API parameters (excluding timeRange/step)
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    const transformed = transformForRecharts(data);
    if (!padToTimeRange || transformed.length === 0) return transformed;

    const seriesKeys = data.series.map((s) => s.name);
    const startMs = finalTimeRange.start.getTime();
    const endMs = finalTimeRange.end.getTime();
    const stepMs = parseDurationToMs(finalStep) ?? 60_000;

    const aggregation: BucketAggregation = chartType === 'bar' ? 'sum' : 'avg';
    return bucketDataToTimeRange(
      transformed,
      startMs,
      endMs,
      stepMs,
      seriesKeys,
      aggregation
    );
  }, [data, finalTimeRange, finalStep, padToTimeRange, chartType]);

  // Handle data change callbacks
  useEffect(() => {
    if (data && onDataChange) {
      onDataChange(data, chartData);
    }
  }, [data, chartData, onDataChange]);

  // Handle series change callbacks
  useEffect(() => {
    if (data?.series && onSeriesChange) {
      onSeriesChange(data.series);
    }
  }, [data?.series, onSeriesChange]);

  // Handle query state change callbacks
  useEffect(() => {
    if (onQueryStateChange) {
      onQueryStateChange({ isLoading, isFetching, error });
    }
  }, [isLoading, isFetching, error, onQueryStateChange]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    if (data) {
      data.series.forEach((series) => {
        config[series.name] = {
          label: series.name,
          color: colorOverrides?.[series.name] ?? series.color ?? '#8884d8',
        };
      });
    }
    return config;
  }, [data, colorOverrides]);

  const timeRangeMs = useMemo(
    () => finalTimeRange.end.getTime() - finalTimeRange.start.getTime(),
    [finalTimeRange]
  );

  const seriesKeys = useMemo(() => data?.series.map((s) => s.name) ?? [], [data?.series]);

  const yAxisScale = useMemo(() => {
    const max = getChartDataMax(chartData, seriesKeys, { stacked: stackBars });
    const tickCount = stackBars ? 6 : 5;
    return getLinearYAxisScale(max, tickCount);
  }, [chartData, seriesKeys, stackBars]);

  const formatAxisValue = useCallback(
    (value: number) => {
      if (yAxisFormatter) {
        return yAxisFormatter(value);
      }
      return formatValue(value, valueFormat, 2);
    },
    [valueFormat, yAxisFormatter]
  );

  const formatXAxisValue = useCallback(
    (tickItem: number) => {
      if (xAxisFormatter) {
        return xAxisFormatter(tickItem);
      }
      return formatChartTimeTick(tickItem, timeRangeMs);
    },
    [xAxisFormatter, timeRangeMs]
  );

  const tooltipLabelFormatter: any = useCallback((label: string) => {
    if (!label) return '';
    return <DateTime date={label} />;
  }, []);

  const renderChartSeries = () => {
    if (!data) return null;

    return data.series.map((s: ChartSeries) => {
      const color = colorOverrides?.[s.name] ?? s.color ?? '#8884d8';
      const seriesProps = {
        series: {
          name: s.name,
          color,
        },
      };

      switch (chartType) {
        case 'area':
          return (
            <AreaSeries key={s.name} {...seriesProps} gradientId={sanitizeGradientId(s.name)} />
          );
        case 'bar':
          return (
            <BarSeries
              key={s.name}
              {...seriesProps}
              stackId={stackBars ? 'stack' : undefined}
              barSize={barSize}
            />
          );
        case 'line':
        default:
          return <LineSeries key={s.name} {...seriesProps} />;
      }
    });
  };

  const ChartComponent = useMemo(() => {
    switch (chartType) {
      case 'area':
        return AreaChart;
      case 'bar':
        return BarChart;
      case 'line':
      default:
        return LineChart;
    }
  }, [chartType]);

  const yAxisWidth = useMemo(() => {
    if (syncId) return 52;
    if (yAxisScale.ticks.length === 0) return 48;
    const maxLabelLength = Math.max(
      ...yAxisScale.ticks.map((tick) => formatAxisValue(tick).length)
    );
    return Math.min(56, Math.max(36, maxLabelLength * 7 + 8));
  }, [syncId, yAxisScale.ticks, formatAxisValue]);

  const xDomain = useMemo((): [number, number] | ['dataMin', 'dataMax'] => {
    if (padToTimeRange) {
      return [finalTimeRange.start.getTime(), finalTimeRange.end.getTime()];
    }
    return ['dataMin', 'dataMax'];
  }, [padToTimeRange, finalTimeRange]);

  const xAxisTicks = useMemo(() => {
    if (!padToTimeRange) return undefined;
    return buildTimeAxisTicks(
      finalTimeRange.start.getTime(),
      finalTimeRange.end.getTime(),
      syncId ? 7 : 6
    );
  }, [padToTimeRange, finalTimeRange, syncId]);

  const chartBottomMargin = showLegend ? 12 : 0;

  const barSize = useMemo(() => {
    if (chartType !== 'bar' || chartData.length === 0) return undefined;
    const plotWidth = Math.max(280, (height ?? 200) * 2.4);
    return Math.max(16, Math.floor((plotWidth / chartData.length) * 0.7));
  }, [chartType, chartData.length, height]);

  return (
    <BaseMetric
      title={title}
      description={description}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      className={className}
      isEmpty={chartData.length === 0}
      height={height}>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-full w-full px-2"
        style={{ height }}>
        <ChartComponent
          syncId={syncId}
          syncMethod={padToTimeRange && syncId ? 'index' : 'value'}
          data={chartData}
          margin={{ top: 4, right: 12, left: 4, bottom: chartBottomMargin }}>
          {chartType === 'area' && data && (
            <defs>
              {data.series.map((s) => {
                const color = colorOverrides?.[s.name] ?? s.color ?? '#8884d8';
                const gradientId = sanitizeGradientId(s.name);
                return (
                  <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
          )}
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={xDomain}
            ticks={xAxisTicks}
            hide={hideXAxis}
            tickFormatter={formatXAxisValue}
            tickLine={false}
            axisLine={false}
            minTickGap={xAxisTicks ? undefined : 24}
            padding={chartType === 'bar' && !padToTimeRange ? { left: 8, right: 8 } : undefined}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          />
          <YAxis
            domain={yAxisScale.domain}
            ticks={yAxisScale.ticks}
            allowDecimals={false}
            tickFormatter={formatAxisValue}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            width={yAxisWidth}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            {...yAxisOptions}
          />
          {showTooltip && (
            <ChartTooltip
              isAnimationActive={false}
              shared={chartType === 'bar'}
              cursor={{ stroke: 'var(--border)' }}
              content={
                typeof tooltipContent === 'function' ? (
                  tooltipContent
                ) : (
                  <CustomTooltip labelFormatter={tooltipLabelFormatter} />
                )
              }
            />
          )}
          {renderChartSeries()}
          {showLegend && <ChartLegend content={<ChartLegendContent className="z-0 mt-2" />} />}
        </ChartComponent>
      </ChartContainer>

      {/* Children slot for additional content below the chart */}
      {children}
    </BaseMetric>
  );
}
