import { useAlbLogsPermission } from '@/features/edge/proxy/hooks/use-alb-logs-permission';
import { albRequestCountQuery } from '@/features/edge/proxy/metrics/queries';
import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import type { MetricCardData } from '@/modules/prometheus';
import { useAlbLogs } from '@/resources/o11y-logs';
import { lastThirtyMinutes } from '@datum-cloud/datum-ui/logs';
import { useMemo } from 'react';

/**
 * Lookback used to decide whether an ALB is idle. Deliberately wider than the
 * overview's selectable window so switching to "last hour" on a quiet load
 * balancer doesn't flip the whole page into its first-run empty state.
 */
export const TRAFFIC_PRESENCE_WINDOW = '24h';
export const TRAFFIC_PRESENCE_WINDOW_LABEL = 'last 24 hours';

export interface AlbTrafficPresence {
  /** True once the lookback query has settled (success or failure). */
  settled: boolean;
  /**
   * True when the ALB served no requests in the lookback window. Always false
   * until settled, and false when the query failed, so cards never show an
   * empty state over data they simply couldn't load.
   */
  idle: boolean;
}

/** Single shared "has this ALB seen any traffic?" signal for the overview. */
export function useAlbTrafficPresence(projectId: string, proxyId: string): AlbTrafficPresence {
  const query = useMemo(
    () => albRequestCountQuery({ projectId, proxyId }, TRAFFIC_PRESENCE_WINDOW),
    [projectId, proxyId]
  );

  // No timeRange: the instant query evaluates at "now" on every refetch.
  const metrics = usePrometheusAPIQuery<MetricCardData>(
    ['alb-traffic-presence', projectId, proxyId, TRAFFIC_PRESENCE_WINDOW],
    { type: 'card', query, metricFormat: 'number' },
    { enabled: !!projectId && !!proxyId, refetchInterval: 30_000 }
  );

  // Access logs land before the next Prometheus scrape. Poll them live so the
  // health strip flips off "waiting for the first request" as soon as a line
  // exists, even while `increase()` is still empty.
  const { hasPermission, isLoading: permLoading } = useAlbLogsPermission();
  const logs = useAlbLogs(projectId, proxyId, {
    timeRange: lastThirtyMinutes(),
    live: true,
    limit: 1,
    enabled: !!projectId && !!proxyId && hasPermission,
  });

  const settled = !metrics.isLoading;
  const metricsIdle = settled && !metrics.isError && (metrics.data?.value ?? 0) <= 0;
  const logsHaveTraffic =
    !permLoading && hasPermission && !logs.isError && (logs.data?.length ?? 0) > 0;
  const idle = metricsIdle && !logsHaveTraffic;

  return { settled, idle };
}
