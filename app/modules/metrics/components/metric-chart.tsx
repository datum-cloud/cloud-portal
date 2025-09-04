/**
 * Generic metric chart component using Shadcn UI Chart components
 */
import { DateFormat } from '@/components/date-format/date-format';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BaseMetric } from '@/modules/metrics/components/base-metric';
import { AreaSeries, BarSeries, LineSeries } from '@/modules/metrics/components/series';
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import { usePrometheusChart } from '@/modules/metrics/hooks';
import type { QueryBuilderFunction } from '@/modules/metrics/types/url.type';
import type { CustomApiParams } from '@/modules/metrics/types/url.type';
import {
  formatValue,
  transformForRecharts,
  type ChartType,
  type MetricFormat,
  type PrometheusQueryOptions,
  ChartSeries,
} from '@/modules/prometheus';
import { format } from 'date-fns';
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
    return transformForRecharts(data);
  }, [data]);

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
          color: series.color ?? '#8884d8',
        };
      });
    }
    return config;
  }, [data]);

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
      return format(new Date(tickItem), 'HH:mm');
    },
    [xAxisFormatter]
  );

  const tooltipLabelFormatter: any = useCallback((label: string) => {
    if (!label) return '';
    return <DateFormat date={label} />;
  }, []);

  const renderChartSeries = () => {
    if (!data) return null;

    return data.series.map((s: ChartSeries) => {
      const seriesProps = {
        series: {
          name: s.name,
          color: s.color ?? '#8884d8',
        },
      };

      switch (chartType) {
        case 'area':
          return <AreaSeries key={s.name} {...seriesProps} />;
        case 'bar':
          return <BarSeries key={s.name} {...seriesProps} />;
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
      <ChartContainer config={chartConfig} className="h-full w-full pr-4" style={{ height }}>
        <ChartComponent
          data={chartData}
          margin={{ top: 0, right: 10, left: 10, bottom: showLegend ? 20 : 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatXAxisValue}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatAxisValue}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={60}
            {...yAxisOptions}
          />
          {showTooltip && (
            <ChartTooltip
              cursor={true}
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
