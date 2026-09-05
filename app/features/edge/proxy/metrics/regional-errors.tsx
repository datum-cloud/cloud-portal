import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albRegionalErrorRpsQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import {
  ChartHeading,
  metricChartStackClassName,
} from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip, formatReqPerSecTick } from '@/modules/metrics';
import type { ChartSeries } from '@/modules/prometheus';
import { useState } from 'react';

export function HttpProxyRegionalErrors({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) {
  const [series, setSeries] = useState<ChartSeries[]>([]);

  return (
    <div className={metricChartStackClassName}>
      <ChartHeading title="Regional 4xx + 5xx" series={series} />
      <MetricChart
        query={(ctx) =>
          albRegionalErrorRpsQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))
        }
        chartType="line"
        showLegend={false}
        padToTimeRange
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        onSeriesChange={setSeries}
        yAxisFormatter={formatReqPerSecTick}
        tooltipContent={(props) => (
          <MetricsChartTooltip {...props} formatValue={(value) => `${value.toFixed(4)} req/s`} />
        )}
        className="text-foreground shadow-none"
      />
    </div>
  );
}
