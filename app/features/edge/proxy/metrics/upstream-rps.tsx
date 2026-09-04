import { DateTime } from '@/components/date-time';
import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albRegionalRpsQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { HttpProxyUpstreamTable } from '@/features/edge/proxy/metrics/upstream-table';
import { MetricChart, MetricChartTooltipContent, toChartLabelDate } from '@/modules/metrics';
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
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Regional requests per second</p>
      <MetricChart
        query={(ctx) => albRegionalRpsQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))}
        chartType="line"
        showLegend={false}
        showTooltip={true}
        padToTimeRange
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        yAxisFormatter={(value) => `${value.toFixed(2)} req/s`}
        yAxisOptions={{ fontSize: 12, width: 100 }}
        tooltipContent={({ active, payload, label, ...props }) => {
          if (!active || !payload?.length) return null;
          const filteredPayload = payload.filter((p) => (p.value as number) > 0);
          if (filteredPayload.length === 0) return null;

          return (
            <MetricChartTooltipContent
              active={active}
              payload={filteredPayload}
              label={label}
              labelFormatter={(value) => <DateTime date={toChartLabelDate(value)} />}
              formatter={(value, name, item) => {
                const indicatorColor = item.payload.fill || item.color;
                return (
                  <div className="flex flex-1 items-center justify-between leading-none">
                    <div className="flex items-center gap-1">
                      <div
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor: indicatorColor,
                          borderColor: indicatorColor,
                        }}
                      />
                      <span className="font-medium">{name}</span>
                    </div>
                    <div className="text-foreground font-medium">
                      {`${(value as number).toFixed(4)} req/s`}
                    </div>
                  </div>
                );
              }}
              {...props}
            />
          );
        }}
        onSeriesChange={setCurrentSeries}
        className="text-foreground shadow-none">
        {currentSeries.length > 0 && <HttpProxyUpstreamTable series={currentSeries} />}
      </MetricChart>
    </div>
  );
};
