import { HttpProxyUpstreamTable } from '@/features/edge/proxy/metrics/upstream-table';
import {
  MetricChart,
  MetricsChartTooltip,
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
      tooltipContent={(props) => (
        <MetricsChartTooltip {...props} formatValue={(value) => `${value.toFixed(4)} req/s`} />
      )}
      onSeriesChange={setCurrentSeries}>
      <HttpProxyUpstreamTable series={currentSeries} />
    </MetricChart>
  );
};
