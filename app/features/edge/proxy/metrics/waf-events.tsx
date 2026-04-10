import { DateTime } from '@/components/date-time';
import {
  MetricChart,
  MetricChartTooltipContent,
  buildPrometheusLabelSelector,
  createRegionFilter,
} from '@/modules/metrics';
import type { ChartSeries } from '@/modules/prometheus';
import { useState } from 'react';

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

export const HttpProxyWafEvents = ({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) => {
  const [series, setSeries] = useState<ChartSeries[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Traffic Protection Events</p>
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
        height={220}
        xAxisFormatter={(value) => {
          const mins = Math.round((Date.now() - value) / 60000);
          return mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
        }}
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
