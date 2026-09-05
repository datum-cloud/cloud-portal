import { AI_EDGE_METRICS_SYNC_ID } from '@/features/edge/proxy/metrics/constants';
import {
  albWafByLabelQuery,
  scopeFromContext,
  stepOr,
} from '@/features/edge/proxy/metrics/queries';
import {
  ChartHeading,
  metricChartStackClassName,
} from '@/features/edge/proxy/metrics/series-legend';
import { MetricChart, MetricsChartTooltip } from '@/modules/metrics';
import { formatValue, type ChartSeries } from '@/modules/prometheus';
import { useState } from 'react';

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
  const [series, setSeries] = useState<ChartSeries[]>([]);

  return (
    <div className={metricChartStackClassName}>
      <ChartHeading title={title} series={series} />
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
        onSeriesChange={setSeries}
        yAxisFormatter={(value) => formatValue(value, 'short-number', 0)}
        tooltipContent={(props) => (
          <MetricsChartTooltip
            {...props}
            formatValue={(value) => Math.round(value).toLocaleString()}
          />
        )}
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
