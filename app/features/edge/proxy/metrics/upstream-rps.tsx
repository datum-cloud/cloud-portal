import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albRegionalRpsQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { ChartBlock, metricChartStackClassName } from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip, formatReqPerSecTick } from '@/modules/metrics';

export const HttpProxyUpstreamRps = ({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) => {
  return (
    <ChartBlock title="Regional requests per second" className={metricChartStackClassName}>
      <MetricChart
        query={(ctx) => albRegionalRpsQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))}
        chartType="line"
        showLegend={false}
        showTooltip={true}
        padToTimeRange
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        yAxisFormatter={formatReqPerSecTick}
        tooltipContent={(props) => (
          <MetricsChartTooltip {...props} formatValue={(value) => `${value.toFixed(4)} req/s`} />
        )}
        className="text-foreground shadow-none"
      />
    </ChartBlock>
  );
};
