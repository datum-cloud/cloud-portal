import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albWafByLabelQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import { ChartBlock, metricChartStackClassName } from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip } from '@/modules/metrics';
import { formatValue } from '@/modules/prometheus';

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
    <ChartBlock title={title} className={metricChartStackClassName}>
      <MetricChart
        query={(ctx) =>
          albWafByLabelQuery(label, scopeFromContext(ctx, projectId, proxyId), stepOr(ctx))
        }
        chartType="bar"
        showLegend={false}
        padToTimeRange
        stackBars
        shareYScale
        syncId={AI_EDGE_METRICS_SYNC_ID}
        height={200}
        yAxisFormatter={(value) => formatValue(value, 'short-number', 0)}
        tooltipContent={(props) => (
          <MetricsChartTooltip
            {...props}
            formatValue={(value) => Math.round(value).toLocaleString()}
          />
        )}
        className="text-foreground shadow-none"
      />
    </ChartBlock>
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
