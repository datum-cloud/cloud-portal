/**
 * Generic metric chart component using Shadcn UI Chart components
 */
import { BaseMetric } from '@/modules/metrics/components/base-metric';
import { MetricsChartTooltip } from '@/modules/metrics/components/metric-tooltip';
import { AreaSeries, BarSeries, LineSeries } from '@/modules/metrics/components/series';
import { useChartScale } from '@/modules/metrics/context/chart-scale';
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
  pickEvenlySpaced,
  resolveChartStep,
  sanitizeGradientId,
  type BucketAggregation,
} from '@/modules/metrics/utils/chart-axis';
import { parseDurationToMs } from '@/modules/metrics/utils/date-parsers';
import { limitSeriesByVolume } from '@/modules/metrics/utils/limit-series';
import {
  formatValue,
  transformForRecharts,
  type ChartType,
  type MetricFormat,
  type PrometheusQueryOptions,
  ChartSeries,
} from '@/modules/prometheus';
import { useApp } from '@/providers/app.provider';
import { getBrowserTimezone } from '@/utils/helpers/timezone.helper';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@datum-cloud/datum-ui/chart';
import { ReactNode, useCallback, useEffect, useId, useMemo } from 'react';
import {
  AreaChart,
  BarChart,
  CartesianGrid,
  LineChart,
  XAxis,
  YAxis,
  type YAxisProps,
} from 'recharts';
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
   * Value written into empty step buckets when `padToTimeRange` is on.
   * Counts/rates should stay `0`. Latency/quantiles should be `null` so
   * no-traffic is a gap, not 0ms.
   */
  padEmptyValue?: number | null;
  /**
   * Recharts syncId — when set, tooltip/cursor sync across charts sharing the same id.
   */
  syncId?: string;
  /** Hide X-axis ticks while keeping the time domain (use on upper rows of synced groups). */
  hideXAxis?: boolean;
  /** Stack bar series at each timestamp (bar charts only). */
  stackBars?: boolean;
  /** Stack area series at each timestamp (area charts only). */
  stackAreas?: boolean;
  /**
   * Keep only the busiest N series and roll the rest into "Other".
   * Use for high-cardinality breakdowns like HTTP status codes.
   */
  maxSeries?: number;
  /**
   * Share the Y-axis domain with sibling charts in a ChartScaleGroup.
   * Use for WAF count charts so the same event volume is the same height.
   */
  shareYScale?: boolean;
  /**
   * Children to render below the chart
   */
  children?: ReactNode;
}

const CustomTooltip = (props: TooltipContentProps<number, string>) => (
  <MetricsChartTooltip {...props} />
);

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
  padEmptyValue = 0,
  syncId,
  hideXAxis = false,
  stackBars = false,
  stackAreas = false,
  maxSeries,
  shareYScale = false,
  children,
}: MetricChartProps) {
  const { timeRange, step, buildQueryContext, filterState } = useMetrics();
  const { userPreferences } = useApp();
  const timezone = userPreferences?.timezone ?? getBrowserTimezone();

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

  const rawStep = useMemo(() => {
    if (resolvedApiParams.step) {
      const context = buildQueryContext();
      return context.getStep(resolvedApiParams.step);
    }
    return step;
  }, [resolvedApiParams.step, step, buildQueryContext, filterState]);

  const rangeMs = useMemo(
    () => finalTimeRange.end.getTime() - finalTimeRange.start.getTime(),
    [finalTimeRange]
  );

  const finalStep = useMemo(() => resolveChartStep(rawStep, rangeMs), [rawStep, rangeMs]);

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

  const chartSource = useMemo(() => {
    if (!data) return data;
    return maxSeries ? limitSeriesByVolume(data, maxSeries) : data;
  }, [data, maxSeries]);

  const chartData = useMemo(() => {
    if (!chartSource) return [];
    const transformed = transformForRecharts(chartSource);
    if (!padToTimeRange || transformed.length === 0) return transformed;

    const seriesKeys = chartSource.series.map((s) => s.name);
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
      aggregation,
      padEmptyValue
    );
  }, [chartSource, finalTimeRange, finalStep, padToTimeRange, chartType, padEmptyValue]);

  // Handle data change callbacks
  useEffect(() => {
    if (chartSource && onDataChange) {
      onDataChange(chartSource, chartData);
    }
  }, [chartSource, chartData, onDataChange]);

  // Handle series change callbacks
  useEffect(() => {
    if (chartSource?.series && onSeriesChange) {
      onSeriesChange(chartSource.series);
    }
  }, [chartSource?.series, onSeriesChange]);

  // Handle query state change callbacks
  useEffect(() => {
    if (onQueryStateChange) {
      onQueryStateChange({ isLoading, isFetching, error });
    }
  }, [isLoading, isFetching, error, onQueryStateChange]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    if (chartSource) {
      chartSource.series.forEach((series) => {
        config[series.name] = {
          label: series.name,
          color: colorOverrides?.[series.name] ?? series.color ?? '#8884d8',
        };
      });
    }
    return config;
  }, [chartSource, colorOverrides]);

  const seriesKeys = useMemo(
    () => chartSource?.series.map((s) => s.name) ?? [],
    [chartSource?.series]
  );

  const stacked = stackBars || stackAreas;
  const isBarChart = chartType === 'bar';
  const scaleId = useId();

  const localYMax = useMemo(
    () => getChartDataMax(chartData, seriesKeys, { stacked }),
    [chartData, seriesKeys, stacked]
  );
  const sharedYMax = useChartScale(shareYScale ? scaleId : null, localYMax);

  const yAxisScale = useMemo(
    () => getLinearYAxisScale(sharedYMax, stacked ? 6 : 5),
    [sharedYMax, stacked]
  );

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
    (tickItem: number | string) => {
      const timestamp = typeof tickItem === 'number' ? tickItem : Number(tickItem);
      if (!Number.isFinite(timestamp)) return '';
      if (xAxisFormatter) {
        return xAxisFormatter(timestamp);
      }
      return formatChartTimeTick(timestamp, rangeMs, timezone);
    },
    [xAxisFormatter, rangeMs, timezone]
  );

  const showDots = useMemo(() => {
    if (chartType !== 'line') return false;
    let points = 0;
    for (const row of chartData) {
      for (const key of seriesKeys) {
        const value = row[key];
        if (typeof value === 'number' && Number.isFinite(value)) points += 1;
      }
    }
    return points > 0 && points <= 16;
  }, [chartType, chartData, seriesKeys]);

  const seriesNodes = useMemo(() => {
    if (!chartSource) return null;

    return chartSource.series.map((s: ChartSeries) => {
      const color = colorOverrides?.[s.name] ?? s.color ?? '#8884d8';
      const series = { name: s.name, color };

      switch (chartType) {
        case 'area':
          return (
            <AreaSeries
              key={s.name}
              series={series}
              gradientId={sanitizeGradientId(s.name)}
              stackId={stackAreas ? 'stack' : undefined}
            />
          );
        case 'bar':
          return (
            <BarSeries
              key={s.name}
              series={series}
              stackId={stackBars ? 'stack' : undefined}
              seriesKeys={stackBars ? seriesKeys : undefined}
            />
          );
        case 'line':
        default:
          return <LineSeries key={s.name} series={series} showDots={showDots} />;
      }
    });
  }, [chartSource, colorOverrides, chartType, stackAreas, stackBars, showDots, seriesKeys]);

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
    if (syncId) return 48;
    if (yAxisScale.ticks.length === 0) return 36;
    const maxLabelLength = Math.max(
      ...yAxisScale.ticks.map((tick) => formatAxisValue(tick).length)
    );
    return Math.min(52, Math.max(32, maxLabelLength * 7 + 6));
  }, [syncId, yAxisScale.ticks, formatAxisValue]);

  const xDomain = useMemo((): [number, number] | ['dataMin', 'dataMax'] => {
    if (padToTimeRange) {
      return [finalTimeRange.start.getTime(), finalTimeRange.end.getTime()];
    }
    return ['dataMin', 'dataMax'];
  }, [padToTimeRange, finalTimeRange]);

  const xAxisTicks = useMemo(() => {
    if (!padToTimeRange) return undefined;
    const tickCount = syncId ? 7 : 6;
    if (isBarChart) {
      return pickEvenlySpaced(
        chartData.map((row) => row.timestamp),
        tickCount
      );
    }
    return buildTimeAxisTicks(
      finalTimeRange.start.getTime(),
      finalTimeRange.end.getTime(),
      tickCount
    );
  }, [padToTimeRange, finalTimeRange, syncId, isBarChart, chartData]);

  const legend = showLegend ? (
    <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-1 pt-1.5 text-[11px] leading-none">
      {Object.entries(chartConfig).map(([key, item]) => (
        <span key={key} className="inline-flex items-center gap-1">
          <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
          {item.label ?? key}
        </span>
      ))}
    </div>
  ) : null;

  return (
    <BaseMetric
      title={title}
      description={description}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      className={className}
      isEmpty={chartData.length === 0}
      height={height}
      footer={
        <>
          {legend}
          {children}
        </>
      }>
      <ChartContainer
        config={chartConfig}
        className="aspect-none h-full w-full justify-stretch overflow-visible [&_.recharts-responsive-container]:!h-full [&_.recharts-responsive-container]:w-full"
        style={{ height, aspectRatio: 'auto' }}>
        <ChartComponent
          syncId={syncId}
          syncMethod={padToTimeRange ? 'index' : 'value'}
          data={chartData}
          margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
          {...(isBarChart ? { barGap: 2, barCategoryGap: '18%' } : {})}>
          {chartType === 'area' && chartSource && (
            <defs>
              {chartSource.series.map((s) => {
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
          {isBarChart ? (
            <XAxis
              dataKey="timestamp"
              type="category"
              hide={hideXAxis}
              ticks={xAxisTicks}
              interval={xAxisTicks ? 0 : 'preserveStartEnd'}
              tickFormatter={formatXAxisValue}
              minTickGap={xAxisTicks ? undefined : 24}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
          ) : (
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
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
          )}
          <YAxis
            domain={yAxisScale.domain}
            ticks={yAxisScale.ticks}
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
              shared={isBarChart}
              cursor={isBarChart ? undefined : { stroke: 'var(--border)' }}
              content={(tooltipContent ?? CustomTooltip) as never}
            />
          )}
          {seriesNodes}
        </ChartComponent>
      </ChartContainer>
    </BaseMetric>
  );
}
