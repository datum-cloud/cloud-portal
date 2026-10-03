import type { OverviewRange } from './overview-range';
import { SparklineStatCard } from './sparkline-stat-card';
import {
  albErrorRateQuery,
  albLatencyPercentilesQuery,
  albRpsQuery,
  albWafIncreaseQuery,
} from '@/features/edge/proxy/metrics/queries';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useMemo } from 'react';

interface HttpProxyMetricsStripProps {
  projectId: string;
  proxyId: string;
  range: OverviewRange;
  showWaf?: boolean;
  wafPending?: boolean;
  /** ALB has seen no traffic; stat cards show a flat baseline and "—". */
  idle?: boolean;
}

/**
 * Four stat cards in a 2×2 grid. The window is chosen on the Live traffic
 * card, which sits directly above.
 */
export function HttpProxyMetricsStrip({
  projectId,
  proxyId,
  range,
  showWaf = false,
  wafPending = false,
  idle = false,
}: HttpProxyMetricsStripProps) {
  const metricsBase = getPathWithParams(paths.project.detail.proxy.detail.metrics, {
    projectId,
    proxyId,
  });

  const scope = useMemo(() => ({ projectId, proxyId }), [projectId, proxyId]);
  const wafScope = useMemo(
    () => ({ ...scope, customLabels: { coraza_outcome: '=~"blocked|dropped"' } }),
    [scope]
  );
  const windowLabel = `Last ${range.shortLabel}`;

  return (
    <section aria-label="Live metrics">
      <div className="grid grid-cols-2 gap-4">
        <SparklineStatCard
          title="Requests"
          href={`${metricsBase}#traffic`}
          query={albRpsQuery(scope, range.step)}
          format="requestsPerSecond"
          color="var(--primary)"
          timeRange={range.timeRange}
          step={range.step}
          rangeLabel={windowLabel}
          idle={idle}
        />
        <SparklineStatCard
          title="Error rate"
          href={`${metricsBase}#traffic`}
          query={albErrorRateQuery(scope, range.step)}
          format="percent"
          color="var(--color-chart-1)"
          timeRange={range.timeRange}
          step={range.step}
          rangeLabel={windowLabel}
          idle={idle}
        />
        <SparklineStatCard
          title="p95 latency"
          href={`${metricsBase}#latency`}
          query={albLatencyPercentilesQuery(scope, range.shortLabel)}
          visual="percentiles"
          format="milliseconds-auto"
          color="var(--primary)"
          timeRange={range.timeRange}
          step={range.shortLabel}
          rangeLabel={windowLabel}
          idle={idle}
        />
        <SparklineStatCard
          title="WAF blocked"
          href={`${metricsBase}#protection`}
          query={albWafIncreaseQuery(wafScope, range.step)}
          valueQuery={albWafIncreaseQuery(wafScope, range.shortLabel)}
          format="short-number"
          precision={0}
          color="var(--color-chart-1)"
          timeRange={range.timeRange}
          step={range.step}
          rangeLabel={windowLabel}
          idle={idle}
          pending={wafPending}
          unavailable={!showWaf && !wafPending}
        />
      </div>
    </section>
  );
}
