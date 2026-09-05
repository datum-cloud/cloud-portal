import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  albWafByOutcomeQuery,
  albWafIncreaseQuery,
  scopeFromContext,
  stepOr,
  windowDuration,
} from '@/features/edge/proxy/metrics/queries';
import { ChartHeading } from '@/features/edge/proxy/metrics/series-legend';
import {
  MetricChart,
  MetricsChartTooltip,
  useMetrics,
  usePrometheusCard,
  type QueryBuilderContext,
} from '@/modules/metrics';
import { formatValue, type ChartSeries } from '@/modules/prometheus';
import type { TrafficProtectionMode } from '@/resources/http-proxies';
import { useCallback, useMemo, useState } from 'react';

export { resetGuardedIncrease } from '@/features/edge/proxy/metrics/queries';

function WafStat({ label, query }: { label: string; query: (ctx: QueryBuilderContext) => string }) {
  const { timeRange, step, buildQueryContext, filterState } = useMetrics();
  const resolvedQuery = useMemo(
    () => query(buildQueryContext()),
    // filterState participates in identity of buildQueryContext output
    [query, buildQueryContext, filterState]
  );
  const { data } = usePrometheusCard({
    query: resolvedQuery,
    timeRange,
    step,
    metricFormat: 'short-number',
  });
  const value = data ? formatValue(data.value, 'short-number', 0) : '—';
  return (
    <div className="text-foreground flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export const HttpProxyWafEvents = ({
  projectId,
  proxyId,
  trafficProtectionMode,
}: {
  projectId: string;
  proxyId: string;
  trafficProtectionMode?: TrafficProtectionMode;
}) => {
  const [series, setSeries] = useState<ChartSeries[]>([]);

  const blockedQuery = useCallback(
    (ctx: QueryBuilderContext) =>
      albWafIncreaseQuery(
        {
          ...scopeFromContext(ctx, projectId, proxyId),
          wafOutcomes: undefined,
          customLabels: { coraza_outcome: '=~"blocked|dropped"' },
        },
        windowDuration(ctx)
      ),
    [projectId, proxyId]
  );

  const allowedQuery = useCallback(
    (ctx: QueryBuilderContext) =>
      albWafIncreaseQuery(
        {
          ...scopeFromContext(ctx, projectId, proxyId),
          wafOutcomes: undefined,
          customLabels: {
            coraza_outcome: 'allowed',
            trafficprotectionpolicy_mode:
              trafficProtectionMode === 'Enforce' ? 'Enforce' : 'Observe',
          },
        },
        windowDuration(ctx)
      ),
    [projectId, proxyId, trafficProtectionMode]
  );

  const allowedLabel = trafficProtectionMode === 'Observe' ? 'Observed' : 'Allowed';

  return (
    <div className="flex flex-col gap-2">
      <ChartHeading
        title="Traffic Protection Events"
        series={series}
        colors={OUTCOME_COLORS}
        labels={OUTCOME_LABELS}
        actions={
          <>
            <WafStat label="Blocked" query={blockedQuery} />
            <WafStat label={allowedLabel} query={allowedQuery} />
          </>
        }
      />

      <MetricChart
        query={(ctx) =>
          albWafByOutcomeQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))
        }
        chartType="bar"
        showLegend={false}
        colorOverrides={OUTCOME_COLORS}
        padToTimeRange
        stackBars
        shareYScale
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        onSeriesChange={setSeries}
        yAxisFormatter={(value) => formatValue(value, 'short-number', 0)}
        tooltipContent={(props) => (
          <MetricsChartTooltip
            {...props}
            formatName={(name) => OUTCOME_LABELS[name] ?? name}
            formatValue={(value) => Math.round(value).toLocaleString()}
          />
        )}
        className="text-foreground shadow-none"
      />
    </div>
  );
};
