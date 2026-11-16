import { albRpsByProxyQuery, GATEWAY_NAME_LABEL } from '@/features/edge/proxy/metrics/queries';
import { useOverviewRange } from '@/features/edge/proxy/overview/overview-range';
import { usePrometheusAPIQuery } from '@/modules/metrics/hooks';
import type {
  ChartDataPoint,
  ChartSeries,
  FormattedMetricData,
  PrometheusError,
} from '@/modules/prometheus';
import { keepPreviousData } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

const REFETCH_INTERVAL_MS = 30_000;
const RATE_WINDOW = '1m';

/** The name the chart formatter gives a series with no labels, as an ungrouped `sum()` returns. */
const AGGREGATE_SERIES_NAME = 'Series';

const NAME_SEPARATOR = ',';

/** Adds the series point by point. A timestamp missing from one series counts only the others. */
function sumPoints(seriesList: ChartSeries[]): ChartDataPoint[] {
  const byTimestamp = new Map<number, ChartDataPoint>();
  for (const series of seriesList) {
    for (const point of series.data) {
      const existing = byTimestamp.get(point.timestamp);
      byTimestamp.set(point.timestamp, {
        timestamp: point.timestamp,
        value: (existing?.value ?? 0) + point.value,
        formattedTime: point.formattedTime,
        labels: {},
      });
    }
  }
  return [...byTimestamp.values()].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Picks one row's request rate out of the per-ALB response.
 *
 * Returns what the row's own ungrouped query used to return: a single
 * label-less series for the named ALBs (summed when a row covers several), or
 * no series at all when none of them reported traffic in the window.
 */
export function selectProxyRequestRate(
  batched: FormattedMetricData,
  proxyNames: readonly string[]
): FormattedMetricData {
  const wanted = new Set(proxyNames);
  const matched = batched.series.filter((series) => wanted.has(series.labels[GATEWAY_NAME_LABEL]));
  if (matched.length === 0) {
    return { series: [], timeRange: batched.timeRange };
  }
  return {
    series: [{ name: AGGREGATE_SERIES_NAME, labels: {}, data: sumPoints(matched) }],
    timeRange: batched.timeRange,
  };
}

interface ProxyRequestRates {
  data: FormattedMetricData | undefined;
  isLoading: boolean;
  error: PrometheusError | null;
}

const ProxyRequestRatesContext = createContext<ProxyRequestRates | null>(null);

interface ProxyRequestRatesProviderProps {
  projectId: string;
  /** Set false while the page has no row that would chart anything. */
  enabled?: boolean;
  children: ReactNode;
}

/**
 * Runs one request-rate query for a whole list page and shares it with the
 * sparkline in every row. Each row asking for itself cost one Prometheus
 * query per row on every 30s tick.
 */
export function ProxyRequestRatesProvider({
  projectId,
  enabled = true,
  children,
}: ProxyRequestRatesProviderProps) {
  // Slide the last-hour window forward on the overview tick. Keying the
  // query on the window end makes each 30s tick fetch the next hour
  // instead of re-requesting the window captured at mount forever.
  const range = useOverviewRange('1h');
  const query = useMemo(() => albRpsByProxyQuery(projectId, RATE_WINDOW), [projectId]);

  const { data, isLoading, error } = usePrometheusAPIQuery<FormattedMetricData>(
    ['proxy-request-rates', range.timeRange.end.getTime()],
    {
      type: 'chart',
      projectId,
      query,
      timeRange: range.timeRange,
      step: range.step,
    },
    {
      enabled: !!projectId && enabled,
      refetchInterval: REFETCH_INTERVAL_MS,
      // Each tick is a new query key. Keep the last window on screen while
      // the next hour loads so the sparklines don't flash their spinners.
      placeholderData: keepPreviousData,
    }
  );

  const value = useMemo(() => ({ data, isLoading, error }), [data, isLoading, error]);

  return (
    <ProxyRequestRatesContext.Provider value={value}>{children}</ProxyRequestRatesContext.Provider>
  );
}

/** One row's share of the page's request-rate query: the summed rate of the named ALBs. */
export function useProxyRequestRate(proxyNames: readonly string[]): ProxyRequestRates {
  const rates = useContext(ProxyRequestRatesContext);
  if (!rates) {
    throw new Error('useProxyRequestRate must be used inside a ProxyRequestRatesProvider');
  }

  // Callers build the list inline, so memoise on its contents, not its identity.
  const namesKey = [...proxyNames].sort().join(NAME_SEPARATOR);
  const { data: batched, isLoading, error } = rates;
  const data = useMemo(
    () =>
      batched && namesKey
        ? selectProxyRequestRate(batched, namesKey.split(NAME_SEPARATOR))
        : undefined,
    [batched, namesKey]
  );

  return { data, isLoading, error };
}
