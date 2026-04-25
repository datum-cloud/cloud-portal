import { DateTime } from '@/components/date-time';
import {
  MetricChart,
  MetricChartTooltipContent,
  buildPrometheusLabelSelector,
  createRegionFilter,
  useMetrics,
  usePrometheusCard,
  type QueryBuilderContext,
} from '@/modules/metrics';
import { formatDurationFromMs } from '@/modules/metrics/utils/date-parsers';
import { formatValue, type ChartSeries } from '@/modules/prometheus';
import type { TrafficProtectionMode } from '@/resources/http-proxies';
import { useCallback, useMemo, useState } from 'react';

const OUTCOME_LABELS: Record<string, string> = {
  allowed: 'Allowed',
  blocked: 'Blocked',
  dropped: 'Dropped',
};

const OUTCOME_COLORS: Record<string, string> = {
  allowed: 'var(--color-chart-2)',
  blocked: 'var(--color-chart-1)',
  dropped: 'var(--color-chart-4)',
};

function windowDuration(ctx: QueryBuilderContext): string {
  return formatDurationFromMs(ctx.timeRange.end.getTime() - ctx.timeRange.start.getTime());
}

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
    (ctx: QueryBuilderContext) => {
      const regionFilter = createRegionFilter(ctx.get('regions'));
      const selector = buildPrometheusLabelSelector({
        baseLabels: {
          resourcemanager_datumapis_com_project_name: projectId,
          gateway_name: proxyId,
        },
        customLabels: {
          label_topology_kubernetes_io_region: '!=""',
          coraza_outcome: '=~"blocked|dropped"',
        },
        filters: [regionFilter],
      });
      return `sum(increase(coraza_envoy_filter_request_events_total${selector}[${windowDuration(ctx)}]))`;
    },
    [projectId, proxyId]
  );

  const allowedQuery = useCallback(
    (ctx: QueryBuilderContext) => {
      const regionFilter = createRegionFilter(ctx.get('regions'));
      const selector = buildPrometheusLabelSelector({
        baseLabels: {
          resourcemanager_datumapis_com_project_name: projectId,
          gateway_name: proxyId,
          coraza_outcome: 'allowed',
          trafficprotectionpolicy_mode: trafficProtectionMode === 'Enforce' ? 'Enforce' : 'Observe',
        },
        customLabels: { label_topology_kubernetes_io_region: '!=""' },
        filters: [regionFilter],
      });
      return `sum(increase(coraza_envoy_filter_request_events_total${selector}[${windowDuration(ctx)}]))`;
    },
    [projectId, proxyId, trafficProtectionMode]
  );

  const allowedLabel = trafficProtectionMode === 'Observe' ? 'Observed' : 'Allowed';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <p className="text-sm font-medium">Traffic Protection Events</p>
          <WafStat label="Blocked" query={blockedQuery} />
          <WafStat label={allowedLabel} query={allowedQuery} />
        </div>
        {series.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {series.map((s) => (
              <div key={s.name} className="text-foreground flex items-center gap-1.5 text-xs">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: OUTCOME_COLORS[s.name] ?? s.color }}
                />
                {OUTCOME_LABELS[s.name] ?? s.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <MetricChart
        query={({ filters, get }) => {
          const regionFilter = createRegionFilter(get('regions'));
          const selector = buildPrometheusLabelSelector({
            baseLabels: {
              resourcemanager_datumapis_com_project_name: projectId,
              gateway_name: proxyId,
            },
            customLabels: { label_topology_kubernetes_io_region: '!=""' },
            filters: [regionFilter],
          });
          const step = filters.step ?? '15m';
          return (
            `sum by (coraza_outcome) (` +
            `sum_over_time(` +
            `increase(coraza_envoy_filter_request_events_total${selector}[1m])` +
            `[${step}:1m]))`
          );
        }}
        chartType="area"
        showLegend={false}
        colorOverrides={OUTCOME_COLORS}
        padToTimeRange
        height={140}
        yAxisFormatter={(value) => String(Math.round(value))}
        yAxisOptions={{ width: 55 }}
        onSeriesChange={setSeries}
        tooltipContent={({ active, payload, label, ...props }) => {
          if (!active || !payload?.length) return null;
          const filteredPayload = payload.filter((p) => (p.value as number) > 0);
          if (!filteredPayload.length) return null;
          return (
            <MetricChartTooltipContent
              active={active}
              payload={filteredPayload}
              label={label}
              labelFormatter={(value) => <DateTime date={value} />}
              formatter={(value, name, item) => (
                <div className="flex flex-1 items-center justify-between leading-none">
                  <div className="flex items-center gap-1">
                    <div
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: item.payload.fill || item.color }}
                    />
                    <span className="font-medium">{OUTCOME_LABELS[name as string] ?? name}</span>
                  </div>
                  <div className="text-foreground font-medium">{Math.round(value as number)}</div>
                </div>
              )}
              {...props}
            />
          );
        }}
        className="text-foreground shadow-none"
      />
    </div>
  );
};
