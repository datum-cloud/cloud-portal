import { DateTime } from '@/components/date-time';
import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import { albErrorRateQuery, scopeFromContext, stepOr } from '@/features/edge/proxy/metrics/queries';
import { MetricChart, MetricChartTooltipContent, toChartLabelDate } from '@/modules/metrics';
import { formatValue } from '@/modules/prometheus';

export function HttpProxyErrorRate({ projectId, proxyId }: { projectId: string; proxyId: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Error rate</p>
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
              formatter={(value, _name, item) => (
                <div className="flex flex-1 items-center justify-between leading-none">
                  <div className="flex items-center gap-1">
                    <div
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: item.payload.fill || item.color }}
                    />
                    <span className="font-medium">4xx + 5xx</span>
                  </div>
                  <div className="text-foreground font-medium">
                    {formatValue(value as number, 'percent')}
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
