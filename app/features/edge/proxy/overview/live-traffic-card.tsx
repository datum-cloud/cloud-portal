import type { OverviewRange } from './overview-range';
import { StatusPulseDot } from '@/components/status-pulse-dot';
import { albRpsQuery } from '@/features/edge/proxy/metrics/queries';
import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import { padDataToTimeRange } from '@/modules/metrics/utils/chart-axis';
import { parseDurationToMs } from '@/modules/metrics/utils/date-parsers';
import { formatValue, type FormattedMetricData } from '@/modules/prometheus';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ActivityIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';

interface HttpProxyLiveTrafficCardProps {
  projectId: string;
  proxyId: string;
  range: OverviewRange;
}

const VALUE_KEY = 'rps';

function relativeTickLabel(timestamp: number, now: number, rangeMs: number): string {
  const agoMs = Math.max(0, now - timestamp);
  if (agoMs < 30_000) return 'now';
  if (rangeMs <= 60 * 60 * 1000) return `${Math.round(agoMs / 60_000)}m ago`;
  const hours = agoMs / 3_600_000;
  return hours < 1 ? `${Math.round(agoMs / 60_000)}m ago` : `${Math.round(hours)}h ago`;
}

/**
 * Requests-per-second histogram for the selected window. Uses the same
 * Prometheus API as the stat cards rather than `MetricChart`, so the overview
 * does not depend on the Metrics tab's URL-driven time range.
 */
export function HttpProxyLiveTrafficCard({
  projectId,
  proxyId,
  range,
}: HttpProxyLiveTrafficCardProps) {
  const scope = useMemo(() => ({ projectId, proxyId }), [projectId, proxyId]);
  const query = useMemo(() => albRpsQuery(scope, range.step), [scope, range.step]);
  const { start, end } = range.timeRange;
  const rangeMs = end.getTime() - start.getTime();

  const { data, isLoading, error } = usePrometheusAPIQuery<FormattedMetricData>(
    ['alb-live-traffic', proxyId, query, start.getTime(), end.getTime(), range.step],
    { type: 'chart', query, timeRange: range.timeRange, step: range.step },
    { enabled: !!projectId && !!proxyId, refetchInterval: 30_000 }
  );

  const stepMs = parseDurationToMs(range.step) ?? 60_000;

  const rows = useMemo(() => {
    const series = data?.series[0];
    const points: Array<{ timestamp: number } & Record<string, number | null>> = (
      series?.data ?? []
    )
      .filter((point) => Number.isFinite(point.value))
      .map((point) => ({ timestamp: point.timestamp, [VALUE_KEY]: Math.max(0, point.value) }));
    return padDataToTimeRange(points, start.getTime(), end.getTime(), stepMs, [VALUE_KEY]);
  }, [data, start, end, stepMs]);

  const stats = useMemo(() => {
    if (!data) return { peak: null, avg: null, hasTraffic: false };
    const values = rows.map((row) => Number(row[VALUE_KEY] ?? 0));
    if (values.length === 0) return { peak: null, avg: null, hasTraffic: false };
    const peak = Math.max(...values);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { peak, avg, hasTraffic: peak > 0 };
  }, [data, rows]);

  const ticks = useMemo(() => {
    if (rows.length === 0) return [];
    const count = 5;
    return Array.from(
      { length: count },
      (_, i) => rows[Math.round((i * (rows.length - 1)) / (count - 1))]?.timestamp
    ).filter((value): value is number => typeof value === 'number');
  }, [rows]);

  const denied = error?.statusCode === 403 || error?.statusCode === 401;
  const now = end.getTime();
  const recentCutoff = now - Math.max(stepMs * 5, 60_000);

  const metricsHref = `${getPathWithParams(paths.project.detail.proxy.detail.metrics, {
    projectId,
    proxyId,
  })}#traffic`;

  return (
    <Card size="sm" className="flex h-full flex-col" data-e2e="alb-live-traffic">
      <CardHeader size="sm">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={ActivityIcon} size={16} className="text-secondary" />
          <Link to={metricsHref} className="hover:underline">
            Live traffic
          </Link>
          {stats.hasTraffic ? <StatusPulseDot variant="active" className="size-4" /> : null}
        </CardTitle>
        <CardDescription className="text-xs">
          Requests per second · {range.label.toLowerCase()}
        </CardDescription>
        <CardAction className="flex items-start gap-4 text-right">
          <div className="flex flex-col">
            <span className="text-sm font-semibold tabular-nums">
              {stats.peak == null ? '—' : formatValue(stats.peak, 'requestsPerSecond', 1)}
            </span>
            <span className="text-muted-foreground text-2xs uppercase">Peak</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tabular-nums">
              {stats.avg == null ? '—' : formatValue(stats.avg, 'requestsPerSecond', 1)}
            </span>
            <span className="text-muted-foreground text-2xs uppercase">Avg</span>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-40 w-full flex-1">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <SpinnerIcon size="sm" />
            </div>
          ) : denied ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Tooltip message="You don't have permission to view metrics">
                <span className="text-muted-foreground text-sm">Metrics unavailable</span>
              </Tooltip>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Unable to load traffic.</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No traffic in this window.</span>
            </div>
          ) : (
            <BarChart
              data={rows}
              responsive
              width="100%"
              height="100%"
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              barCategoryGap="20%">
              <YAxis
                width={28}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickFormatter={(value: number) => formatValue(value, 'number', 0)}
                allowDecimals={false}
              />
              <XAxis
                dataKey="timestamp"
                ticks={ticks}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                tickFormatter={(value: number) => relativeTickLabel(value, now, rangeMs)}
                interval={0}
              />
              <Bar dataKey={VALUE_KEY} isAnimationActive={false} radius={[2, 2, 0, 0]}>
                {rows.map((row) => (
                  <Cell
                    key={row.timestamp}
                    fill="var(--primary)"
                    className={cn(row.timestamp < recentCutoff && 'opacity-45')}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
