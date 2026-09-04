import { DateTime } from '@/components/date-time';
import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albWafByLabelQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { MetricChart, MetricChartTooltipContent, toChartLabelDate } from '@/modules/metrics';

function WafBreakdownChart({
  projectId,
  proxyId,
  title,
  label,
}: {
  projectId: string;
  proxyId: string;
  title: string;
  label: 'coraza_rule_severity' | 'http_method';
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>
      <MetricChart
        query={(ctx) =>
          albWafByLabelQuery(label, scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))
        }
        chartType="bar"
        showLegend
        padToTimeRange
        stackBars
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        tooltipContent={({ active, payload, label: tick, ...props }) => {
          if (!active || !payload?.length) return null;
          const filteredPayload = payload.filter((p) => (p.value as number) > 0);
          if (!filteredPayload.length) return null;
          return (
            <MetricChartTooltipContent
              active={active}
              payload={filteredPayload}
              label={tick}
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
                  <div className="text-foreground font-medium">{Math.round(value as number)}</div>
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

export function HttpProxyWafSeverity({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) {
  return (
    <WafBreakdownChart
      projectId={projectId}
      proxyId={proxyId}
      title="Events by severity"
      label="coraza_rule_severity"
    />
  );
}

export function HttpProxyWafMethods({
  projectId,
  proxyId,
}: {
  projectId: string;
  proxyId: string;
}) {
  return (
    <WafBreakdownChart
      projectId={projectId}
      proxyId={proxyId}
      title="Events by HTTP method"
      label="http_method"
    />
  );
}
