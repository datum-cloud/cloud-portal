import { DateFormat } from '@/components/date-format/date-format';
import { MetricChart, MetricChartTooltipContent, useMetrics } from '@/modules/metrics';
import { useMemo } from 'react';

export const HttpProxyUpstreamRps = ({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) => {
  const { timeRange, step } = useMetrics();

  const query = useMemo(() => {
    return `sum(rate(envoy_vhost_vcluster_upstream_rq{resourcemanager_datumapis_com_project_name="${projectId}",gateway_name="${proxyId}",gateway_namespace="default",label_topology_kubernetes_io_region!=""}[1m])) by (label_topology_kubernetes_io_region)`;
  }, [projectId, proxyId]);

  return (
    <MetricChart
      query={query}
      title="Regional Upstream RPS"
      chartType="line"
      step={step}
      timeRange={timeRange}
      showLegend={false}
      showTooltip={true}
      yAxisFormatter={(value) => `${value.toFixed(2)} req/s`}
      yAxisOptions={{ fontSize: 12, width: 100 }}
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
                      <span className="font-medium">{name}</span>
                    </div>
                    <div className="text-foreground font-medium">
                      {`${(value as number).toFixed(2)} req/s`}
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
