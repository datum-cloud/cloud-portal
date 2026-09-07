import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albRegionalErrorRpsQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { ChartBlock, metricChartStackClassName } from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip, formatReqPerSecTick } from '@/modules/metrics';

export function HttpProxyRegionalErrors({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) {
  return (
    <ChartBlock title="Regional 4xx + 5xx" className={metricChartStackClassName}>
      <MetricChart
        query={(ctx) =>
          albRegionalErrorRpsQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))
        }
        chartType="line"
        showLegend={false}
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
}
