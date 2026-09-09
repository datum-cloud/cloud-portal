import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  RESPONSE_CODE_COLORS,
  albRpsByClassQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { ChartBlock, metricChartStackClassName } from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip } from '@/modules/metrics';

export const HttpProxyEdgeRequests = ({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) => {
  return (
    <ChartBlock
      title="Requests per second"
      colors={RESPONSE_CODE_COLORS}
      className={metricChartStackClassName}>
      <MetricChart
        query={(ctx) => albRpsByClassQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))}
        chartType="area"
        showLegend={false}
        colorOverrides={RESPONSE_CODE_COLORS}
        padToTimeRange
        stackAreas
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        tooltipContent={(props) => (
          <MetricsChartTooltip {...props} formatValue={(value) => `${value.toFixed(2)} req/s`} />
        )}
        className="text-foreground shadow-none"
      />
    </ChartBlock>
  );
};
