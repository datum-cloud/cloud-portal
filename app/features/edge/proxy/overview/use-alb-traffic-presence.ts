import { albRequestCountQuery } from '@/features/edge/proxy/metrics/queries';
import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import type { MetricCardData } from '@/modules/prometheus';
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
  const { data, isLoading, isError } = usePrometheusAPIQuery<MetricCardData>(
    ['alb-traffic-presence', projectId, proxyId, TRAFFIC_PRESENCE_WINDOW],
    { type: 'card', query, metricFormat: 'number' },
    { enabled: !!projectId && !!proxyId, refetchInterval: 60_000 }
  );

  const settled = !isLoading;
  const idle = settled && !isError && (data?.value ?? 0) <= 0;

  return { settled, idle };
}
