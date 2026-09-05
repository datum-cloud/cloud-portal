import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  RESPONSE_CODE_COLORS,
  albRpsByClassQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import {
  ChartHeading,
  metricChartStackClassName,
} from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip } from '@/modules/metrics';
import type { ChartSeries } from '@/modules/prometheus';
import { useState } from 'react';

export const HttpProxyEdgeRequests = ({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) => {
  const [series, setSeries] = useState<ChartSeries[]>([]);

  return (
    <div className={metricChartStackClassName}>
      <ChartHeading title="Requests per second" series={series} colors={RESPONSE_CODE_COLORS} />
      <MetricChart
        query={(ctx) => albRpsByClassQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))}
        chartType="area"
        showLegend={false}
        colorOverrides={RESPONSE_CODE_COLORS}
        padToTimeRange
        stackAreas
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        onSeriesChange={setSeries}
        tooltipContent={(props) => (
          <MetricsChartTooltip {...props} formatValue={(value) => `${value.toFixed(2)} req/s`} />
        )}
        className="text-foreground shadow-none"
      />
    </div>
  );
};
