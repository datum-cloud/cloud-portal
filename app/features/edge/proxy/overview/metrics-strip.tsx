import { SparklineStatCard } from './sparkline-stat-card';
import {
  albErrorRateQuery,
  albLatencyQuantileQuery,
  albRpsQuery,
  albWafIncreaseQuery,
} from '@/features/edge/proxy/metrics/queries';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { ChartSplineIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

interface HttpProxyMetricsStripProps {
  projectId: string;
  proxyId: string;
  showWaf?: boolean;
}

export function HttpProxyMetricsStrip({
  projectId,
  proxyId,
  showWaf = false,
}: HttpProxyMetricsStripProps) {
  const metricsBase = getPathWithParams(paths.project.detail.proxy.detail.metrics, {
    projectId,
    proxyId,
  });

  const scope = useMemo(() => ({ projectId, proxyId }), [projectId, proxyId]);

  return (
    <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow-none sm:pt-6 sm:pb-4">
      <CardContent className="flex flex-col gap-4 p-0 sm:px-6 sm:pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon icon={ChartSplineIcon} size={20} className="text-secondary stroke-2" />
            <span className="text-base font-semibold">Health</span>
          </div>
          <LinkButton as={Link} type="primary" theme="link" size="link" href={metricsBase}>
            View metrics
          </LinkButton>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
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
            query={albLatencyQuantileQuery(0.95, scope, '1m')}
            format="milliseconds-auto"
            color="var(--color-chart-4)"
          />
          {showWaf ? (
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
            />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
