import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albRegionalRpsQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import {
  ChartHeading,
  metricChartStackClassName,
} from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip, formatReqPerSecTick } from '@/modules/metrics';
import { ChartSeries } from '@/modules/prometheus';
import { useState } from 'react';

export const HttpProxyUpstreamRps = ({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) => {
  const [currentSeries, setCurrentSeries] = useState<ChartSeries[]>([]);

  return (
    <div className={metricChartStackClassName}>
      <ChartHeading title="Regional requests per second" series={currentSeries} />
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
        onSeriesChange={setCurrentSeries}
        className="text-foreground shadow-none"
      />
    </div>
  );
};
