import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  QUANTILE_COLORS,
  albLatencyPercentilesQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { ChartBlock } from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip } from '@/modules/metrics';
import { formatValue } from '@/modules/prometheus';

export function HttpProxyLatencyPercentiles({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) {
  return (
    <ChartBlock title="Upstream latency" colors={QUANTILE_COLORS}>
      <MetricChart
        query={(ctx) =>
          albLatencyPercentilesQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))
        }
        chartType="line"
        showLegend={false}
        colorOverrides={QUANTILE_COLORS}
        valueFormat="milliseconds-auto"
        padToTimeRange
        padEmptyValue={null}
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={220}
        yAxisFormatter={(value) => formatValue(value, 'milliseconds-auto')}
        tooltipContent={(props) => (
          <MetricsChartTooltip
            {...props}
            formatValue={(value) => formatValue(value, 'milliseconds-auto')}
          />
        )}
        className="text-foreground shadow-none"
      />
    </ChartBlock>
  );
}
