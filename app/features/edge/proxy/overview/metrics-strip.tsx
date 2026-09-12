import {
  OVERVIEW_RANGE_OPTIONS,
  type OverviewRange,
  type OverviewRangeValue,
} from './overview-range';
import { SparklineStatCard } from './sparkline-stat-card';
import {
  albErrorRateQuery,
  albLatencyPercentilesQuery,
  albRpsQuery,
  albWafIncreaseQuery,
} from '@/features/edge/proxy/metrics/queries';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { HistoryIcon } from 'lucide-react';
import { useMemo } from 'react';

interface HttpProxyMetricsStripProps {
  projectId: string;
  proxyId: string;
  range: OverviewRange;
  onRangeChange: (value: OverviewRangeValue) => void;
  showWaf?: boolean;
  wafPending?: boolean;
  /** ALB has seen no traffic; stat cards show a flat baseline and "—". */
  idle?: boolean;
}

/** "Live metrics" header with the shared window control plus four stat cards. */
export function HttpProxyMetricsStrip({
  projectId,
  proxyId,
  range,
  onRangeChange,
  showWaf = false,
  wafPending = false,
  idle = false,
}: HttpProxyMetricsStripProps) {
  const metricsBase = getPathWithParams(paths.project.detail.proxy.detail.metrics, {
    projectId,
    proxyId,
  });

  const scope = useMemo(() => ({ projectId, proxyId }), [projectId, proxyId]);
  const wafScope = useMemo(
    () => ({ ...scope, customLabels: { coraza_outcome: '=~"blocked|dropped"' } }),
    [scope]
  );
  const windowLabel = `Last ${range.shortLabel}`;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="alb-live-metrics-heading">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 id="alb-live-metrics-heading" className="shrink-0 text-sm font-semibold">
            Live metrics
          </h2>
          {idle ? (
            <p className="text-muted-foreground truncate text-xs" aria-live="polite">
              <span aria-hidden="true">· </span>
              No data yet — metrics start streaming with the first request
            </p>
          ) : null}
        </div>
        <Select value={range.value} onValueChange={(v) => onRangeChange(v as OverviewRangeValue)}>
          <SelectTrigger
            className="bg-card h-8 w-auto gap-2 text-xs"
            aria-label="Live metrics time range"
            data-e2e="alb-overview-range">
            <Icon icon={HistoryIcon} size={14} className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {OVERVIEW_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <SparklineStatCard
          title="Requests"
          href={`${metricsBase}#traffic`}
          query={albRpsQuery(scope, range.step)}
          format="requestsPerSecond"
          color="var(--primary)"
          timeRange={range.timeRange}
          step={range.step}
          rangeLabel={windowLabel}
          idle={idle}
        />
        <SparklineStatCard
          title="Error rate"
          href={`${metricsBase}#traffic`}
          query={albErrorRateQuery(scope, range.step)}
          format="percent"
          color="var(--color-chart-1)"
          timeRange={range.timeRange}
          step={range.step}
          rangeLabel={windowLabel}
          idle={idle}
        />
        <SparklineStatCard
          title="p95 latency"
          href={`${metricsBase}#latency`}
          query={albLatencyPercentilesQuery(scope, range.shortLabel)}
          visual="percentiles"
          format="milliseconds-auto"
          color="var(--primary)"
          timeRange={range.timeRange}
          step={range.shortLabel}
          rangeLabel={windowLabel}
          idle={idle}
        />
        <SparklineStatCard
          title="WAF blocked"
          href={`${metricsBase}#protection`}
          query={albWafIncreaseQuery(wafScope, range.step)}
          valueQuery={albWafIncreaseQuery(wafScope, range.shortLabel)}
          format="short-number"
          precision={0}
          color="var(--color-chart-1)"
          timeRange={range.timeRange}
          step={range.step}
          rangeLabel={windowLabel}
          idle={idle}
          pending={wafPending}
          unavailable={!showWaf && !wafPending}
        />
      </div>
    </section>
  );
}
