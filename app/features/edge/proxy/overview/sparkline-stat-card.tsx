import { QUANTILE_COLORS } from '@/features/edge/proxy/metrics/queries';
import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import {
  formatValue,
  transformForRecharts,
  type ChartSeries,
  type FormattedMetricData,
  type MetricCardData,
  type MetricFormat,
} from '@/modules/prometheus';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { Area, AreaChart, YAxis } from 'recharts';

interface SparklineStatCardProps {
  title: string;
  href?: string;
  query: string;
  valueQuery?: string;
  format: MetricFormat;
  precision?: number;
  color?: string;
  visual?: 'sparkline' | 'percentiles';
  pending?: boolean;
  unavailable?: boolean;
  unavailableLabel?: string;
  timeRange?: { start: Date; end: Date };
  step?: string;
  rangeLabel?: string;
  refetchInterval?: number | false;
}

function lastFiniteValue(series: ChartSeries | undefined): number | null {
  if (!series) return null;
  for (let i = series.data.length - 1; i >= 0; i--) {
    const value = series.data[i]?.value;
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

function quantileValue(series: ChartSeries[] | undefined, quantile: string): number | null {
  const match = series?.find(
    (item) => item.labels?.quantile === quantile || item.name === quantile
  );
  return lastFiniteValue(match);
}

function PercentileRangeBar({
  p50,
  p95,
  p99,
  format,
  precision,
}: {
  p50: number | null;
  p95: number | null;
  p99: number | null;
  format: MetricFormat;
  precision?: number;
}) {
  if (p50 == null && p95 == null && p99 == null) return null;
  const values = [p50, p95, p99].filter((value): value is number => value != null);
  const max = Math.max(...values, 0);
  if (max <= 0) return null;

  const start = p50 ?? Math.min(...values);
  const end = p99 ?? Math.max(...values);
  const left = (Math.min(start, end) / max) * 100;
  const width = (Math.abs(end - start) / max) * 100;
  const marker = p95 != null ? (p95 / max) * 100 : null;

  return (
    <div className="flex h-8 w-full flex-col justify-center gap-1">
      <div className="bg-muted relative h-1.5 w-full rounded-full">
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 1.5)}%`,
            backgroundColor: QUANTILE_COLORS.p95,
            opacity: 0.22,
          }}
        />
        {marker != null ? (
          <div
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${marker}%`, backgroundColor: QUANTILE_COLORS.p95 }}
          />
        ) : null}
      </div>
      <div className="text-muted-foreground text-2xs flex justify-between tabular-nums">
        <span>{p50 == null ? 'p50 —' : `p50 ${formatValue(p50, format, precision)}`}</span>
        <span>{p99 == null ? 'p99 —' : `p99 ${formatValue(p99, format, precision)}`}</span>
      </div>
    </div>
  );
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
  visual = 'sparkline',
  pending = false,
  unavailable = false,
  unavailableLabel = 'Not enabled',
  timeRange: timeRangeProp,
  step,
  rangeLabel,
  refetchInterval = 30_000,
}: SparklineStatCardProps) {
  const endTime = useMemo(() => timeRangeProp?.end ?? new Date(), [timeRangeProp?.end]);
  const startTime = useMemo(
    () => timeRangeProp?.start ?? new Date(endTime.getTime() - OVERVIEW_WINDOW_MS),
    [timeRangeProp?.start, endTime]
  );
  const timeRange = useMemo(() => ({ start: startTime, end: endTime }), [startTime, endTime]);
  const isPercentiles = visual === 'percentiles';
  const resolvedStep = step ?? (isPercentiles ? '1h' : '1m');
  const windowLabel = rangeLabel ?? 'Last 1h';
  const gradientId = useMemo(() => `spark-${title.replace(/\s+/g, '-').toLowerCase()}`, [title]);

  const {
    data: chartData,
    isLoading: chartLoading,
    error: chartError,
  } = usePrometheusAPIQuery<FormattedMetricData>(
    [
      'alb-sparkline',
      title,
      query,
      visual,
      timeRange.start.getTime(),
      timeRange.end.getTime(),
      resolvedStep,
    ],
    { type: 'chart', query, timeRange, step: resolvedStep },
    { enabled: !!query && !unavailable, refetchInterval }
  );

  const {
    data: cardData,
    isLoading: cardLoading,
    error: cardError,
  } = usePrometheusAPIQuery<MetricCardData>(
    ['alb-stat', title, valueQuery, timeRange.start.getTime(), timeRange.end.getTime()],
    { type: 'card', query: valueQuery, timeRange, metricFormat: format },
    { enabled: !!valueQuery && !unavailable, refetchInterval }
  );

  const dataKey = chartData?.series[0]?.name || 'value';

  const series = useMemo(() => {
    if (!chartData || chartError) return [];
    const rows = transformForRecharts(chartData)
      .map((row) => {
        const raw = row[dataKey];
        return typeof raw === 'number' && Number.isFinite(raw) ? { ...row, [dataKey]: raw } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    if (rows.length === 1) {
      return [rows[0], { ...rows[0], timestamp: rows[0].timestamp + 1 }];
    }
    return rows;
  }, [chartData, chartError, dataKey]);

  const yDomain = useMemo<[number, number] | undefined>(() => {
    const values = series
      .map((row) => row[dataKey])
      .filter((v): v is number => typeof v === 'number');
    if (!values.length) return undefined;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = min === max ? Math.max(Math.abs(min) * 0.25, 1) : (max - min) * 0.1;
    return [min - pad, max + pad];
  }, [series, dataKey]);

  const percentiles = useMemo(
    () => ({
      p50: quantileValue(chartData?.series, 'p50'),
      p95: quantileValue(chartData?.series, 'p95'),
      p99: quantileValue(chartData?.series, 'p99'),
    }),
    [chartData]
  );

  const headline = useMemo(() => {
    if (isPercentiles) {
      if (percentiles.p95 == null) return null;
      return formatValue(percentiles.p95, format, precision);
    }
    if (valueQuery) {
      if (!cardData || cardError) return null;
      return formatValue(cardData.value, format, precision);
    }
    const last = [...series].reverse().find((row) => typeof row[dataKey] === 'number')?.[dataKey];
    if (typeof last !== 'number' || Number.isNaN(last)) return null;
    return formatValue(last, format, precision);
  }, [
    isPercentiles,
    percentiles.p95,
    valueQuery,
    cardData,
    cardError,
    series,
    dataKey,
    format,
    precision,
  ]);

  const isLoading = pending || (!unavailable && (chartLoading || (!!valueQuery && cardLoading)));
  const error = chartError ?? cardError;
  const denied = error?.statusCode === 403 || error?.statusCode === 401;

  const card = (
    <Card
      className={cn(
        'relative h-full w-full overflow-hidden rounded-xl px-3 py-4 shadow-none sm:pt-5 sm:pb-4',
        href && 'hover:bg-muted/30 transition-colors'
      )}>
      {isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <SpinnerIcon size="sm" />
        </div>
      ) : null}
      <CardContent
        className={cn('flex min-w-0 flex-col gap-2 p-0 sm:px-3', isLoading && 'invisible')}>
        <div className="flex h-4 items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs font-medium">{title}</span>
          <span className="text-muted-foreground text-2xs">
            {unavailable ? '\u00a0' : windowLabel}
          </span>
        </div>
        <div className="text-foreground flex h-7 items-center text-xl font-semibold tabular-nums">
          {unavailable ? (
            <span className="text-muted-foreground text-sm font-medium">{unavailableLabel}</span>
          ) : denied ? (
            <Tooltip message="You don't have permission to view metrics">
              <span className="text-muted-foreground text-sm">&mdash;</span>
            </Tooltip>
          ) : (
            (headline ?? '—')
          )}
        </div>
        <div className="h-8 w-full">
          {denied ? null : isPercentiles ? (
            <PercentileRangeBar
              p50={percentiles.p50}
              p95={percentiles.p95}
              p99={percentiles.p99}
              format={format}
              precision={precision}
            />
          ) : series.length < 2 ? null : (
            <AreaChart
              data={series}
              responsive
              width="100%"
              height={32}
              margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              {yDomain ? <YAxis hide domain={yDomain} /> : null}
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                fillOpacity={1}
                connectNulls={false}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link
      to={href}
      className="focus-visible:ring-ring block h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none">
      {card}
    </Link>
  );
}
