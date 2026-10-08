import { resolvedPassive, type BackendRow } from './backend-pool';
import { albRpsQuery } from '@/features/edge/proxy/metrics/queries';
import {
  DEFAULT_OVERVIEW_RANGE,
  useOverviewRange,
} from '@/features/edge/proxy/overview/overview-range';
import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import type { MetricCardData } from '@/modules/prometheus';
import { HTTP_PROXY_MAX_BACKENDS, type HttpProxy } from '@/resources/http-proxies';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useMemo, type ReactNode } from 'react';

function PoolStatCard({
  title,
  value,
  unit,
  detail,
}: {
  title: string;
  value: ReactNode;
  unit?: string;
  detail: ReactNode;
}) {
  return (
    <Card size="sm" className="h-full w-full">
      <CardContent className="flex min-w-0 flex-col gap-3">
        <Text size="sm" weight="medium" textColor="muted">
          {title}
        </Text>
        <div className="flex items-baseline gap-1.5">
          <Text as="div" size="2xl" weight="semibold" className="tabular-nums">
            {value}
          </Text>
          {unit ? (
            <Text as="span" size="sm" weight="medium" textColor="muted">
              {unit}
            </Text>
          ) : null}
        </div>
        {/* Wraps rather than truncates: two-up on mobile leaves ~150px a card. */}
        <Text as="div" size="xs" textColor="muted" className="text-pretty">
          {detail}
        </Text>
      </CardContent>
    </Card>
  );
}

/** Pool-wide request rate. Envoy doesn't report it per backend. */
function useThroughput(projectId: string, proxyName: string) {
  const range = useOverviewRange(DEFAULT_OVERVIEW_RANGE);
  const query = useMemo(
    () => albRpsQuery({ projectId, proxyId: proxyName }, range.shortLabel),
    [projectId, proxyName, range.shortLabel]
  );
  return usePrometheusAPIQuery<MetricCardData>(
    ['alb-pool-throughput', query, range.timeRange.end.getTime()],
    { type: 'card', query, timeRange: range.timeRange, metricFormat: 'requestsPerSecond' },
    { enabled: !!projectId && !!proxyName, refetchInterval: 30_000 }
  );
}

export function HttpProxyPoolStats({
  proxy,
  projectId,
  rows,
  idle,
}: {
  proxy: HttpProxy;
  projectId: string;
  rows: BackendRow[];
  idle?: boolean;
}) {
  const receiving = rows.filter((row) => !row.drained).length;
  const drained = rows.length - receiving;
  const passive = resolvedPassive(proxy.healthCheck?.passive);
  const throughput = useThroughput(projectId, proxy.name);
  const denied = throughput.error?.statusCode === 403 || throughput.error?.statusCode === 401;
  const rps = throughput.data?.value;

  const throughputValue = throughput.isLoading ? (
    <SpinnerIcon size="sm" />
  ) : denied ? (
    <Tooltip message="You don't have permission to view metrics">
      <span className="text-muted-foreground">—</span>
    </Tooltip>
  ) : idle || typeof rps !== 'number' || !Number.isFinite(rps) ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    rps.toFixed(2)
  );

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      <PoolStatCard
        title="Backends"
        value={rows.length}
        detail={`in pool · up to ${HTTP_PROXY_MAX_BACKENDS}`}
      />
      <PoolStatCard
        title="Receiving traffic"
        value={`${receiving} / ${rows.length}`}
        detail={drained === 0 ? 'all backends weighted' : `${drained} drained at weight 0`}
      />
      <PoolStatCard
        title="Throughput"
        value={throughputValue}
        unit={typeof throughputValue === 'string' ? 'req/s' : undefined}
        detail={idle ? 'no requests yet' : 'across pool · last 5m'}
      />
      <PoolStatCard
        title="Outlier detection"
        value={passive ? 'On' : 'Off'}
        detail={
          passive ? `ejects after ${passive.consecutive5xxErrors} × 5xx` : 'endpoints never ejected'
        }
      />
    </div>
  );
}
