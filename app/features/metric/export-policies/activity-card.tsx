import { DateTime } from '@/components/date-time';
import { MetricsProvider, usePrometheusChart } from '@/modules/metrics';
import { BaseMetric } from '@/modules/metrics/components/base-metric';
import { formatValue, transformForRecharts } from '@/modules/prometheus';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-ui/components';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@shadcn/ui/chart';
import { differenceInDays, endOfDay, format, startOfDay, subDays } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

const CustomTooltip = ({ labelFormatter, ...props }: any) => {
  return <ChartTooltipContent labelFormatter={labelFormatter} {...props} />;
};

type TimeRangeOption = 'today' | 'yesterday' | 'last7days' | 'last14days' | 'last30days';

const ActivityChart = () => {
  const { projectId } = useParams();
  const [timeRangeOption, setTimeRangeOption] = useState<TimeRangeOption>('today');

  const getTimeRange = useCallback((option: TimeRangeOption) => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (option) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        start = startOfDay(yesterday);
        end = endOfDay(yesterday);
        break;
      case 'last7days':
        start = startOfDay(subDays(now, 6));
        end = endOfDay(now);
        break;
      case 'last14days':
        start = startOfDay(subDays(now, 13));
        end = endOfDay(now);
        break;
      case 'last30days':
        start = startOfDay(subDays(now, 29));
        end = endOfDay(now);
        break;
      default:
        start = startOfDay(now);
        end = endOfDay(now);
    }

    return { start, end };
  }, []);

  const timeRange = useMemo(() => getTimeRange(timeRangeOption), [timeRangeOption, getTimeRange]);

  const step = useMemo(() => {
    const daysDiff = differenceInDays(timeRange.end, timeRange.start);
    if (daysDiff <= 1) {
      return '1h';
    } else if (daysDiff <= 7) {
      return '4h';
    } else if (daysDiff <= 14) {
      return '6h';
    } else {
      return '12h';
    }
  }, [timeRange]);

  const { data, isLoading, error, isFetching } = usePrometheusChart({
    query: `
      label_replace(
        rate(vector_component_errors_total{error_type="request_failed", resourcemanager_datumapis_com_project_name="test-rdzjb8"}),
        "series_name", "Metrics error rate", "", ""
      )
      or
      label_replace(
        rate(vector_component_sent_events_total{component_kind="sink", resourcemanager_datumapis_com_project_name="test-rdzjb8"}),
        "series_name", "Metrics per second", "", ""
      )
    `.trim(),
    timeRange,
    step,
    enabled: !!projectId,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return transformForRecharts(data);
  }, [data]);

  const seriesConfig = useMemo(() => {
    return {
      'Metrics error rate': {
        gradientId: 'gradient-metrics-error-rate',
        color: '#9C7979',
      },
      'Metrics per second': {
        gradientId: 'gradient-metrics-per-second',
        color: '#4D6356',
      },
    } as Record<string, { gradientId: string; color: string }>;
  }, []);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    if (data) {
      data.series.forEach((series) => {
        config[series.name] = {
          label: series.labels.series_name,
          color: seriesConfig[series.labels.series_name].color,
        };
      });
    }
    return config;
  }, [data]);

  const tooltipLabelFormatter = useCallback((label: string | number | undefined) => {
    if (!label) return '';
    return <DateTime date={String(label)} />;
  }, []);

  const formatXAxisValue = useCallback(
    (tickItem: number) => {
      const date = new Date(tickItem);
      const daysDiff = differenceInDays(timeRange.end, timeRange.start);
      if (daysDiff > 1) {
        return format(date, 'MMM dd');
      } else {
        return format(date, 'hh:mmaaa');
      }
    },
    [timeRange]
  );

  return (
    <Card className="px-3 py-8 shadow">
      <CardHeader className="mb-2">
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="text-lg font-medium">Activity</span>
          <Select
            value={timeRangeOption}
            onValueChange={(value) => setTimeRangeOption(value as TimeRangeOption)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last14days">Last 14 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BaseMetric
          className="border-none p-0 shadow-none"
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          isEmpty={chartData.length === 0}
          height={250}>
          <ChartContainer
            config={chartConfig}
            className="h-full w-full pr-4"
            style={{ height: 250, backgroundColor: 'transparent' }}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                {data?.series.map((s) => {
                  const color = seriesConfig[s.labels.series_name].color;
                  const gradientId = seriesConfig[s.labels.series_name].gradientId;
                  return (
                    <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  );
                })}
              </defs>
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
                tickFormatter={(value) => formatValue(value, 'number', 2)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={60}
              />
              <ChartTooltip
                cursor={true}
                content={<CustomTooltip labelFormatter={tooltipLabelFormatter} />}
              />
              {data?.series.map((s) => {
                const color = seriesConfig[s.labels.series_name].color;
                const gradientId = seriesConfig[s.labels.series_name].gradientId;
                return (
                  <Area
                    key={s.name}
                    dataKey={s.name}
                    type="monotone"
                    fill={`url(#${gradientId})`}
                    fillOpacity={0.2}
                    stroke={color}
                  />
                );
              })}
            </AreaChart>
          </ChartContainer>
        </BaseMetric>
      </CardContent>
    </Card>
  );
};

export const ExportPolicyActivityCard = () => {
  return (
    <MetricsProvider>
      <ActivityChart />
    </MetricsProvider>
  );
};
