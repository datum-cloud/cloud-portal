import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albRpsByStatusCodeQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { ChartBlock, metricChartStackClassName } from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip, formatReqPerSecTick } from '@/modules/metrics';

export function HttpProxyStatusCodes({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) {
  return (
    <ChartBlock title="Requests by status code" className={metricChartStackClassName}>
      <MetricChart
        query={(ctx) =>
          albRpsByStatusCodeQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))
        }
        chartType="bar"
        showLegend={false}
        padToTimeRange
        stackBars
        maxSeries={5}
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        yAxisFormatter={formatReqPerSecTick}
        tooltipContent={(props) => (
          <MetricsChartTooltip {...props} formatValue={(value) => `${value.toFixed(2)} req/s`} />
        )}
        className="text-foreground overflow-visible shadow-none"
      />
    </ChartBlock>
  );
}
