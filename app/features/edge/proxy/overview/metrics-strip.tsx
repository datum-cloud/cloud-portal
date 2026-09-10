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
  showWaf?: boolean;
  wafPending?: boolean;
}

export function HttpProxyMetricsStrip({
  projectId,
  proxyId,
  showWaf = false,
  wafPending = false,
}: HttpProxyMetricsStripProps) {
  const metricsBase = getPathWithParams(paths.project.detail.proxy.detail.metrics, {
    projectId,
    proxyId,
  });

  const scope = useMemo(() => ({ projectId, proxyId }), [projectId, proxyId]);

  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      <SparklineStatCard
        title="Requests"
        href={`${metricsBase}#traffic`}
        query={albRpsQuery(scope, '1m')}
        format="requestsPerSecond"
        color="var(--primary)"
      />
      <SparklineStatCard
        title="Error rate"
        href={`${metricsBase}#traffic`}
        query={albErrorRateQuery(scope, '1m')}
        format="percent"
        color="var(--color-chart-1)"
      />
      <SparklineStatCard
        title="p95 latency"
        href={`${metricsBase}#latency`}
        query={albLatencyPercentilesQuery(scope, '1h')}
        visual="percentiles"
        format="milliseconds-auto"
        color="var(--primary)"
      />
      <SparklineStatCard
        title="WAF blocked"
        href={`${metricsBase}#protection`}
        query={albWafIncreaseQuery(
          { ...scope, customLabels: { coraza_outcome: '=~"blocked|dropped"' } },
          '1m'
        )}
        valueQuery={albWafIncreaseQuery(
          { ...scope, customLabels: { coraza_outcome: '=~"blocked|dropped"' } },
          '1h'
        )}
        format="short-number"
        precision={0}
        color="var(--color-chart-1)"
        pending={wafPending}
        unavailable={!showWaf && !wafPending}
      />
    </div>
  );
}
