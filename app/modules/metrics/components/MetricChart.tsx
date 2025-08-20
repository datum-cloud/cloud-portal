/**
 * Generic metric chart component using Shadcn UI Chart components
 */
import { BaseMetric } from './BaseMetric';
import { AreaSeries, BarSeries, LineSeries } from './series';
import { DateFormat } from '@/components/date-format/date-format';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { usePrometheusChart } from '@/modules/metrics/hooks';
import {
  formatValue,
  transformForRecharts,
  type ChartType,
  type MetricFormat,
  type PrometheusQueryOptions,
  ChartSeries,
} from '@/modules/prometheus';
import { format } from 'date-fns';
import React from 'react';
import { CartesianGrid, AreaChart, BarChart, LineChart, XAxis, YAxis, YAxisProps } from 'recharts';
import { TooltipContentProps } from 'recharts/types/component/Tooltip';

export interface MetricChartProps extends PrometheusQueryOptions {
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
  tooltipContent?: (props: TooltipContentProps<any, any>) => React.ReactNode;
}

const CustomTooltip = ({ labelFormatter, ...props }: any) => {
  return <ChartTooltipContent labelFormatter={labelFormatter} {...props} />;
};

export function MetricChart({
  query,
  timeRange,
  step,
  enabled = true,
  title,
  description,
  chartType = 'line',
  height = 300,
  showLegend = true,
  showTooltip = true,
  valueFormat = 'number',
  className,
  yAxisFormatter,
  xAxisFormatter,
  yAxisOptions,
  tooltipContent,
  onDataChange,
  onSeriesChange,
  onQueryStateChange,
}: MetricChartProps) {
  const { data, isLoading, isFetching, error } = usePrometheusChart({
    query,
    timeRange,
    step,
    enabled,
  });

  const chartData = React.useMemo(() => {
    if (!data) return [];
    return transformForRecharts(data);
  }, [data]);

  // Handle data change callbacks
  React.useEffect(() => {
    if (data && onDataChange) {
      onDataChange(data, chartData);
    }
  }, [data, chartData, onDataChange]);

  // Handle series change callbacks
  React.useEffect(() => {
    if (data?.series && onSeriesChange) {
      onSeriesChange(data.series);
    }
  }, [data?.series, onSeriesChange]);

  // Handle query state change callbacks
  React.useEffect(() => {
    if (onQueryStateChange) {
      onQueryStateChange({ isLoading, isFetching, error });
    }
  }, [isLoading, isFetching, error, onQueryStateChange]);

  const chartConfig = React.useMemo(() => {
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

  const formatAxisValue = React.useCallback(
    (value: number) => {
      if (yAxisFormatter) {
        return yAxisFormatter(value);
      }
      return formatValue(value, valueFormat, 2);
    },
    [valueFormat, yAxisFormatter]
  );

  const formatXAxisValue = React.useCallback(
    (tickItem: number) => {
      if (xAxisFormatter) {
        return xAxisFormatter(tickItem);
      }
      return format(new Date(tickItem), 'HH:mm');
    },
    [xAxisFormatter]
  );

  const tooltipLabelFormatter: any = React.useCallback((label: string) => {
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

  const ChartComponent = React.useMemo(() => {
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
      <div style={{ height }}>
        <ChartContainer config={chartConfig} className="h-full w-full">
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
      </div>
    </BaseMetric>
  );
}
