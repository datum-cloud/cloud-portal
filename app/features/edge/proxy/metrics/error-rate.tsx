import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import { albErrorRateQuery, scopeFromContext, stepOr } from '@/features/edge/proxy/metrics/queries';
import { ChartHeading } from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip } from '@/modules/metrics';
import { formatValue } from '@/modules/prometheus';

export function HttpProxyErrorRate({ projectId, proxyId }: { projectId: string; proxyId: string }) {
  return (
    <div className="flex flex-col gap-2">
      <ChartHeading title="Error rate" />
      <MetricChart
        query={(ctx) => albErrorRateQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))}
        chartType="line"
        showLegend={false}
        colorOverrides={{ Series: 'var(--color-chart-1)' }}
        valueFormat="percent"
        padToTimeRange
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        yAxisFormatter={(value) => formatValue(value, 'percent')}
        tooltipContent={(props) => (
          <MetricsChartTooltip
            {...props}
            formatName={() => '4xx + 5xx'}
            formatValue={(value) => formatValue(value, 'percent')}
          />
        )}
        className="text-foreground shadow-none"
      />
    </div>
  );
}
