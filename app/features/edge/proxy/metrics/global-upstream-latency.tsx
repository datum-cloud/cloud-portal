import { MetricChart, MetricsChartTooltip, buildHistogramQuantileQuery } from '@/modules/metrics';
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
      query={({ filters }) => {
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
      tooltipContent={(props) => (
        <MetricsChartTooltip
          {...props}
          formatName={() => '99%'}
          formatValue={(value) => formatValue(value, 'milliseconds-auto')}
        />
      )}
    />
  );
};
