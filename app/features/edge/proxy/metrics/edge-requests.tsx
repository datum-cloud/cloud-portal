import { DateTime } from '@/components/date-time';
import {
  MetricChart,
  MetricChartTooltipContent,
  MetricsToolbar,
  buildHistogramQuantileQuery,
  buildPrometheusLabelSelector,
  createRegionFilter,
} from '@/modules/metrics';
import { formatValue } from '@/modules/prometheus';
import type { ChartSeries } from '@/modules/prometheus';
import { useState } from 'react';

const RESPONSE_CODE_COLORS: Record<string, string> = {
  '2XX': 'var(--color-chart-2)',
  '3XX': 'var(--color-chart-4)',
  '4XX': 'var(--color-chart-1)',
  '5XX': 'var(--color-chart-3)',
};

export const HttpProxyEdgeRequests = ({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) => {
  const [series, setSeries] = useState<ChartSeries[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium">Requests per second</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MetricsToolbar className="w-fit">
          <MetricsToolbar.CoreControls />
        </MetricsToolbar>
        {series.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {series.map((s) => (
              <div key={s.name} className="text-foreground flex items-center gap-1.5 text-xs">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: RESPONSE_CODE_COLORS[s.name] ?? s.color ?? '#8884d8' }}
                />
                {s.name}
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
              gateway_namespace: 'default',
            },
            customLabels: { label_topology_kubernetes_io_region: '!=""' },
            filters: [regionFilter],
          });
          const step = filters.step ?? '15m';
          // Group individual response codes into classes (2XX, 3XX, 4XX, 5XX).
          // Use a sub-query (sum_over_time of 1m increases) to avoid increase()
          // extrapolation inflating counts when data only partially covers the step window.
          return (
            `sum by (envoy_response_code_class) (` +
            `sum_over_time(` +
            `label_replace(` +
            `increase(envoy_vhost_vcluster_upstream_rq${selector}[1m]),` +
            `"envoy_response_code_class","$\{1}XX","envoy_response_code","([0-9]).*"` +
            `)[${step}:1m]))`
          );
        }}
        chartType="area"
        showLegend={false}
        colorOverrides={RESPONSE_CODE_COLORS}
        height={220}
        xAxisFormatter={(value) => {
          const mins = Math.round((Date.now() - value) / 60000);
          return mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
        }}
        yAxisFormatter={(value) => String(Math.round(value))}
        yAxisOptions={{ width: 55 }}
        onSeriesChange={setSeries}
        className="text-foreground shadow-none"
      />

      <p className="text-sm font-medium">P95 Upstream Latency</p>
      <MetricChart
        query={({ filters }) =>
          buildHistogramQuantileQuery({
            quantile: 0.95,
            metric: 'envoy_vhost_vcluster_upstream_rq_time_bucket',
            timeWindow: filters.step ?? '15m',
            baseLabels: {
              resourcemanager_datumapis_com_project_name: projectId,
              gateway_name: proxyId,
              gateway_namespace: 'default',
            },
            customLabels: { label_topology_kubernetes_io_region: '!=""' },
            groupBy: ['le'],
          })
        }
        chartType="area"
        showLegend={false}
        colorOverrides={{ Series: 'var(--primary)' }}
        valueFormat="milliseconds-auto"
        height={220}
        xAxisFormatter={(value) => {
          const mins = Math.round((Date.now() - value) / 60000);
          return mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
        }}
        yAxisFormatter={(value) => formatValue(value, 'milliseconds-auto')}
        yAxisOptions={{ width: 55 }}
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
              formatter={(value, _name, item) => (
                <div className="flex flex-1 items-center justify-between leading-none">
                  <div className="flex items-center gap-1">
                    <div
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: item.payload.fill || item.color }}
                    />
                    <span className="font-medium">p95</span>
                  </div>
                  <div className="text-foreground font-medium">
                    {formatValue(value as number, 'milliseconds-auto')}
                  </div>
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
