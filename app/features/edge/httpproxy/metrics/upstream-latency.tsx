import { DateFormat } from '@/components/date-format/date-format';
import { MetricChart, MetricChartTooltipContent, useMetrics } from '@/modules/metrics';
import { formatValue } from '@/modules/prometheus';
import { useMemo } from 'react';

export const HttpProxyUpstreamLatency = ({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) => {
  const { timeRange, step } = useMetrics();

  const query = useMemo(() => {
    return `histogram_quantile(0.99, sum(rate(envoy_vhost_vcluster_upstream_rq_time_bucket{resourcemanager_datumapis_com_project_name="${projectId}", label_topology_kubernetes_io_region!="", gateway_namespace="default", gateway_name="${proxyId}"}[${step}])) by (le, namespace))`;
  }, [projectId, proxyId, step]);

  return (
    <MetricChart
      query={query}
      title="Global Upstream Latency Percentile"
      chartType="line"
      step={step}
      timeRange={timeRange}
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
              labelFormatter={(value) => <DateFormat date={value} />}
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
