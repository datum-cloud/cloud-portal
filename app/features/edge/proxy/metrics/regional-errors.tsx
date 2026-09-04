import { DateTime } from '@/components/date-time';
import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albRegionalErrorRpsQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { MetricChart, MetricChartTooltipContent, toChartLabelDate } from '@/modules/metrics';

export function HttpProxyRegionalErrors({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Regional 4xx + 5xx</p>
      <MetricChart
        query={(ctx) =>
          albRegionalErrorRpsQuery(scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))
        }
        chartType="line"
        showLegend
        padToTimeRange
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        yAxisFormatter={(value) => `${value.toFixed(2)} req/s`}
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
                    {`${(value as number).toFixed(4)} req/s`}
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
