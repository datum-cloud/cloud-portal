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
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
  showLegend?: boolean;
  showTooltip?: boolean;
  colors?: string[];
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
  colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'],
  valueFormat = 'number',
  className,
  yAxisFormatter,
  xAxisFormatter,
  yAxisOptions,
  tooltipContent,
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

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    if (data) {
      data.series.forEach((series, index) => {
        config[series.name] = {
          label: series.name,
          color: series.color || colors[index % colors.length],
        };
      });
    }
    return config;
  }, [data, colors]);

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

    return data.series.map((s) => {
      const seriesProps = {
        key: s.name,
        series: {
          name: s.name,
          color: `var(--color-${s.name})`,
        },
      };

      switch (chartType) {
        case 'area':
          return <AreaSeries {...seriesProps} />;
        case 'bar':
          return <BarSeries {...seriesProps} />;
        case 'line':
        default:
          return <LineSeries {...seriesProps} />;
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
      isEmpty={!data}
      height={height}>
      <div style={{ height }}>
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ChartComponent
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: showLegend ? 20 : 5 }}>
            <CartesianGrid vertical={false} />
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
