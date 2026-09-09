import {
  albErrorRateQuery,
  albLatencyPercentilesQuery,
  albRpsQuery,
  albWafIncreaseQuery,
  scopeFromContext,
  stepOr,
  windowDuration,
} from '@/features/edge/proxy/metrics/queries';
import { SparklineStatCard } from '@/features/edge/proxy/overview/sparkline-stat-card';
import { PRESET_RANGES, useMetrics } from '@/modules/metrics';
import { formatDurationFromMs, parseDurationToMs } from '@/modules/metrics/utils/date-parsers';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useQueryState } from 'nuqs';
import { useMemo } from 'react';

function rangeLabelFor(start: Date, end: Date, urlRange?: string | null): string {
  const preset = PRESET_RANGES.find((item) => item.value === urlRange);
  if (preset) return preset.label;
  const duration = formatDurationFromMs(end.getTime() - start.getTime());
  return `Last ${duration}`;
}

export function HttpProxyMetricsKpis({
  projectId,
  proxyId,
  showWaf,
  wafPending = false,
}: {
  projectId: string;
  proxyId: string;
  showWaf?: boolean;
  wafPending?: boolean;
}) {
  const { timeRange, refreshInterval, buildQueryContext, filterState } = useMetrics();
  const [urlTimeRange] = useQueryState('timeRange');

  const metricsBase = getPathWithParams(paths.project.detail.proxy.detail.metrics, {
    projectId,
    proxyId,
  });

  const queries = useMemo(() => {
    const ctx = buildQueryContext();
    const scope = scopeFromContext(ctx, projectId, proxyId);
    const rateWindow = stepOr(ctx);
    const window = windowDuration(ctx);
    const blocked = {
      ...scope,
      wafOutcomes: undefined,
      customLabels: { coraza_outcome: '=~"blocked|dropped"' },
    };

    return {
      rps: albRpsQuery(scope, rateWindow),
      error: albErrorRateQuery(scope, rateWindow),
      latency: albLatencyPercentilesQuery(scope, window),
      wafSpark: albWafIncreaseQuery(blocked, '1m'),
      wafValue: albWafIncreaseQuery(blocked, window),
      step: rateWindow,
      window,
    };
  }, [buildQueryContext, filterState, projectId, proxyId]);

  const rangeLabel = rangeLabelFor(timeRange.start, timeRange.end, urlTimeRange);
  const refetchInterval =
    refreshInterval === 'off' ? false : (parseDurationToMs(refreshInterval) ?? false);

  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      <SparklineStatCard
        title="Requests"
        href={`${metricsBase}#traffic`}
        query={queries.rps}
        format="requestsPerSecond"
        color="var(--primary)"
        timeRange={timeRange}
        step={queries.step}
        rangeLabel={rangeLabel}
        refetchInterval={refetchInterval}
      />
      <SparklineStatCard
        title="Error rate"
        href={`${metricsBase}#traffic`}
        query={queries.error}
        format="percent"
        color="var(--color-chart-1)"
        timeRange={timeRange}
        step={queries.step}
        rangeLabel={rangeLabel}
        refetchInterval={refetchInterval}
      />
      <SparklineStatCard
        title="p95 latency"
        href={`${metricsBase}#latency`}
        query={queries.latency}
        visual="percentiles"
        format="milliseconds-auto"
        color="var(--primary)"
        timeRange={timeRange}
        step={queries.window}
        rangeLabel={rangeLabel}
        refetchInterval={refetchInterval}
      />
      <SparklineStatCard
        title="WAF blocked"
        href={`${metricsBase}#protection`}
        query={queries.wafSpark}
        valueQuery={queries.wafValue}
        format="short-number"
        precision={0}
        color="var(--color-chart-1)"
        timeRange={timeRange}
        step={queries.step}
        rangeLabel={rangeLabel}
        refetchInterval={refetchInterval}
        pending={wafPending}
        unavailable={!showWaf && !wafPending}
      />
    </div>
  );
}
