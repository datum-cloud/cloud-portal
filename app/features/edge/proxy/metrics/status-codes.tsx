import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albRpsByStatusCodeQuery,
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

export function HttpProxyStatusCodes({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) {
  const [series, setSeries] = useState<ChartSeries[]>([]);

  return (
    <div className={metricChartStackClassName}>
      <ChartHeading title="Requests by status code" series={series} />
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
        onSeriesChange={setSeries}
        yAxisFormatter={formatReqPerSecTick}
        tooltipContent={(props) => (
          <MetricsChartTooltip {...props} formatValue={(value) => `${value.toFixed(2)} req/s`} />
        )}
        className="text-foreground overflow-visible shadow-none"
      />
    </div>
  );
}
