import { DateTime } from '@/components/date-time';
import {
  MetricChart,
  MetricChartTooltipContent,
  buildHistogramQuantileQuery,
} from '@/modules/metrics';
import { formatValue } from '@/modules/prometheus';

export const HttpProxyGlobalUpstreamLatency = ({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) => {
  return (
    <MetricChart
      query={({ filters, get }) => {
        return buildHistogramQuantileQuery({
          quantile: 0.99,
          metric: 'envoy_vhost_vcluster_upstream_rq_time_bucket',
          timeWindow: filters.step || '5m',
          baseLabels: {
            resourcemanager_datumapis_com_project_name: projectId,
            gateway_name: proxyId,
            gateway_namespace: 'default',
          },
          customLabels: {
            label_topology_kubernetes_io_region: '!=""',
          },
          // filters: [createRegionFilter(get('regions'))],
          groupBy: ['le', 'namespace'],
        });
      }}
      title="Global Upstream Latency Percentile"
      chartType="line"
      showLegend={false}
      showTooltip={true}
      valueFormat="milliseconds-auto"
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
                  <div className="flex flex-1 items-center justify-between leading-none">
                    <div className="flex items-center gap-1">
                      <div
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: indicatorColor,
                          borderColor: indicatorColor,
                        }}></div>
                      <span className="font-medium">99%</span>
                    </div>
                    <div className="text-foreground font-medium">
                      {`${formatValue(value as number, 'milliseconds-auto')}`}
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
    />
  );
};
