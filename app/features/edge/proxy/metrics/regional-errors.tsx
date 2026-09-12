import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albRegionalErrorRpsQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { ChartBlock, metricChartStackClassName } from '@/features/edge/proxy/metrics/series-legend';
import { useRegionLabels } from '@/features/edge/proxy/metrics/use-region-labels';
import { MetricChart, MetricsChartTooltip, formatReqPerSecTick } from '@/modules/metrics';

export function HttpProxyRegionalErrors({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) {
  const { legendLabels, formatName } = useRegionLabels(projectId);

  return (
    <ChartBlock
      title="Regional 4xx + 5xx"
      labels={legendLabels}
      className={metricChartStackClassName}>
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
          <MetricsChartTooltip
            {...props}
            formatName={formatName}
            formatValue={(value) => `${value.toFixed(4)} req/s`}
          />
        )}
        className="text-foreground"
      />
    </ChartBlock>
  );
}
