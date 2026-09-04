import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import {
  formatValue,
  transformForRecharts,
  type FormattedMetricData,
  type MetricCardData,
  type MetricFormat,
} from '@/modules/prometheus';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@datum-cloud/datum-ui/chart';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface SparklineStatCardProps {
  title: string;
  href: string;
  query: string;
  valueQuery?: string;
  format: MetricFormat;
  precision?: number;
  color?: string;
}

const OVERVIEW_WINDOW_MS = 60 * 60 * 1000;

export function SparklineStatCard({
  title,
  href,
  query,
  valueQuery,
  format,
  precision,
  color = 'var(--primary)',
}: SparklineStatCardProps) {
  const endTime = useMemo(() => new Date(), []);
  const startTime = useMemo(() => new Date(endTime.getTime() - OVERVIEW_WINDOW_MS), [endTime]);
  const timeRange = useMemo(() => ({ start: startTime, end: endTime }), [startTime, endTime]);
  const gradientId = useMemo(() => `spark-${title.replace(/\s+/g, '-').toLowerCase()}`, [title]);

  const chartConfig: ChartConfig = {
    value: { label: title, color },
  };

  const {
    data: chartData,
    isLoading: chartLoading,
    error: chartError,
  } = usePrometheusAPIQuery<FormattedMetricData>(
    ['alb-overview-sparkline', title, query],
    { type: 'chart', query, timeRange, step: '1m' },
    { enabled: !!query, refetchInterval: 30_000 }
  );

  const {
    data: cardData,
    isLoading: cardLoading,
    error: cardError,
  } = usePrometheusAPIQuery<MetricCardData>(
    ['alb-overview-stat', title, valueQuery],
    { type: 'card', query: valueQuery, timeRange, metricFormat: format },
    { enabled: !!valueQuery, refetchInterval: 30_000 }
  );

  const series = useMemo(() => {
    if (!chartData || chartError) return [];
    return transformForRecharts(chartData);
  }, [chartData, chartError]);

  const dataKey = chartData?.series[0]?.name || 'value';

  const headline = useMemo(() => {
    if (valueQuery) {
      if (!cardData || cardError) return null;
      return formatValue(cardData.value, format, precision);
    }
    const last = series.at(-1)?.[dataKey];
    if (typeof last !== 'number' || Number.isNaN(last)) return null;
    return formatValue(last, format, precision);
  }, [valueQuery, cardData, cardError, series, dataKey, format, precision]);

  const isLoading = chartLoading || (!!valueQuery && cardLoading);
  const error = chartError ?? cardError;
  const denied = error?.statusCode === 403 || error?.statusCode === 401;

  return (
    <Link
      to={href}
      className={cn(
        'hover:bg-muted/40 focus-visible:ring-ring flex min-w-0 flex-col gap-2 rounded-lg p-3 transition-colors',
        'focus-visible:ring-2 focus-visible:outline-none'
      )}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-muted-foreground text-xs font-medium">{title}</span>
        <span className="text-muted-foreground text-2xs">Last 1h</span>
      </div>
      <div className="text-foreground text-xl font-semibold tabular-nums">
        {isLoading ? (
          <SpinnerIcon size="sm" />
        ) : denied ? (
          <Tooltip message="You don't have permission to view metrics">
            <span className="text-muted-foreground text-sm">&mdash;</span>
          </Tooltip>
        ) : (
          (headline ?? '—')
        )}
      </div>
      <div className="h-8 w-full">
        {isLoading || denied || series.length === 0 ? null : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const value = payload[0].value as number;
                    return (
                      <div className="border-border bg-background text-1xs rounded-md border px-2 py-1 shadow-sm">
                        <div className="text-foreground font-medium">
                          {formatValue(value, format, precision)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  fillOpacity={1}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>
    </Link>
  );
}
