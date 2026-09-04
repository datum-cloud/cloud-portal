import { DateTime } from '@/components/date-time';
import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  QUANTILE_COLORS,
  albLatencyPercentilesQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { SeriesLegend } from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricChartTooltipContent, toChartLabelDate } from '@/modules/metrics';
import { formatValue, type ChartSeries } from '@/modules/prometheus';
import { useState } from 'react';

export function HttpProxyLatencyPercentiles({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) {
  const [series, setSeries] = useState<ChartSeries[]>([]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Upstream latency</p>
        <SeriesLegend series={series} colors={QUANTILE_COLORS} />
      </div>
      <MetricChart
        query={(ctx) =>
          albLatencyPercentilesQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))
        }
        chartType="line"
        showLegend={false}
        colorOverrides={QUANTILE_COLORS}
        valueFormat="milliseconds-auto"
        padToTimeRange
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={220}
        yAxisFormatter={(value) => formatValue(value, 'milliseconds-auto')}
        onSeriesChange={setSeries}
        tooltipContent={({ active, payload, label, ...props }) => {
          if (!active || !payload?.length) return null;
          const filteredPayload = payload.filter((p) => (p.value as number) > 0);
          if (!filteredPayload.length) return null;
          return (
            <MetricChartTooltipContent
              active={active}
              payload={filteredPayload}
              label={label}
              labelFormatter={(value) => <DateTime date={toChartLabelDate(value)} />}
              formatter={(value, name, item) => (
                <div className="flex flex-1 items-center justify-between leading-none">
                  <div className="flex items-center gap-1">
                    <div
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: item.payload.fill || item.color }}
                    />
                    <span className="font-medium">{name}</span>
                  </div>
                  <div className="text-foreground font-medium">
                    {formatValue(value as number, 'milliseconds-auto')}
                  </div>
                </div>
              )}
              {...props}
            />
          );
        }}
        className="text-foreground shadow-none"
      />
    </div>
  );
}
