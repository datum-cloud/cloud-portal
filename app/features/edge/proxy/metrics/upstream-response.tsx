import { DateTime } from '@/components/date-time';
import { HttpProxyUpstreamTable } from '@/features/edge/proxy/metrics/upstream-table';
import {
  MetricChart,
  MetricChartTooltipContent,
  buildRateQuery,
  createRegionFilter,
} from '@/modules/metrics';
import { ChartSeries } from '@/modules/prometheus';
import { useState } from 'react';

export const HttpProxyUpstreamResponse = ({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) => {
  const [currentSeries, setCurrentSeries] = useState<ChartSeries[]>([]);
  return (
    <MetricChart
      query={({ filters, get }) => {
        return buildRateQuery({
          metric: 'envoy_vhost_vcluster_upstream_rq',
          timeWindow: filters.step || '15m',
          baseLabels: {
            resourcemanager_datumapis_com_project_name: projectId,
            gateway_name: proxyId,
            gateway_namespace: 'default',
          },
          customLabels: {
            label_topology_kubernetes_io_region: '!=""',
          },
          filters: [createRegionFilter(get('regions'))],
          groupBy: ['label_topology_kubernetes_io_region', 'envoy_response_code'],
        });
      }}
      title="Regional Upstream Response"
      chartType="line"
      showLegend={false}
      showTooltip={true}
      yAxisFormatter={(value) => `${value.toFixed(2)} req/s`}
      yAxisOptions={{ fontSize: 12, width: 90 }}
      tooltipContent={({ active, payload, label, ...props }) => {
        if (active && payload && payload.length) {
          const filteredPayload = payload.filter((p) => p.value > 0);
          if (filteredPayload.length === 0) return null;

          return (
            <MetricChartTooltipContent
              active={active}
              payload={filteredPayload}
              label={label}
              labelFormatter={(value) => <DateTime date={value} />}
              formatter={(value, name, item) => {
                const indicatorColor = item.payload.fill || item.color;
                return (
                  <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                    <div className="flex items-center gap-1">
                      <div
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: indicatorColor,
                          borderColor: indicatorColor,
                        }}></div>
                      <span className="font-medium">{name}</span>
                    </div>
                    <div className="text-foreground font-medium">
                      {`${(value as number).toFixed(4)} req/s`}
                    </div>
                  </div>
                );
              }}
              {...props}
            />
          );
        }
        return null;
      }}
      onSeriesChange={setCurrentSeries}>
      <HttpProxyUpstreamTable series={currentSeries} />
    </MetricChart>
  );
};
