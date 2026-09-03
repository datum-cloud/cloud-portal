import { buildLocationDirectory } from './enrich-active-pops';
import { ChunkErrorBoundary } from '@/components/chunk-error-boundary/chunk-error-boundary';
import {
  buildHistogramQuantileQuery,
  buildPrometheusLabelSelector,
  buildRateQuery,
  usePrometheusChart,
  usePrometheusLabels,
} from '@/modules/metrics';
import { formatValue, type ChartSeries } from '@/modules/prometheus';
import { usePermission } from '@/modules/rbac';
import { ControlPlaneStatus } from '@/resources/base';
import { useHttpProxy } from '@/resources/http-proxies';
import { useLocations, useLocationsWatch } from '@/resources/locations';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { lazyWithRetry } from '@/utils/helpers/lazy-with-retry';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { cn } from '@datum-cloud/datum-ui/utils';
import { MapPinIcon } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Poll while the catalog is empty — LocationBinding can take ~15–90s. */
const LOCATION_PROJECTION_POLL_MS = 4_000;
const LOCATION_PROJECTION_GIVE_UP_MS = 120_000;

const ActivePopsMap = lazyWithRetry(
  () => import('./active-pops-map').then((m) => ({ default: m.ActivePopsMap })),
  'active-pops-map'
);

const REGION_LABEL = 'label_topology_kubernetes_io_region';
const PROXY_METRIC = 'envoy_vhost_vcluster_upstream_rq';
const LATENCY_METRIC = 'envoy_vhost_vcluster_upstream_rq_time_bucket';

function latestSeriesValue(series: ChartSeries | undefined): number | undefined {
  if (!series?.data.length) return undefined;
  for (let index = series.data.length - 1; index >= 0; index -= 1) {
    const value = series.data[index]?.value;
    if (value != null && Number.isFinite(value)) return value;
  }
  return undefined;
}

function seriesByRegion(
  series: ChartSeries[] | undefined,
  region: string
): ChartSeries | undefined {
  return series?.find((item) => item.labels?.[REGION_LABEL] === region || item.name === region);
}

function formatRps(value: number | undefined): string {
  if (value == null) return '—';
  if (value > 0 && value < 0.01) return '<0.01 req/s';
  return formatValue(value, 'requestsPerSecond', 2);
}

function formatLatency(value: number | undefined): string {
  if (value == null || value <= 0) return '—';
  return `${formatValue(value, 'milliseconds-auto', 1)} p95`;
}

function formatErrors(errorRps: number | undefined, totalRps: number | undefined): string {
  if (errorRps == null || totalRps == null || totalRps <= 0) return '—';
  return `${formatValue(errorRps / totalRps, 'percent', 1)} 5xx`;
}

function LocationRowSkeleton() {
  return (
    <li>
      <div className="flex w-full items-start gap-3 rounded-lg px-2 py-2">
        <Skeleton className="mt-1.5 size-2 shrink-0 rounded-full" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </span>
          <Skeleton className="mt-1.5 h-3 w-32" />
          <Skeleton className="mt-2 h-3 w-36" />
        </span>
      </div>
    </li>
  );
}

export const ActivePopsCard = ({ projectId, proxyId }: { projectId: string; proxyId: string }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [focusRegion, setFocusRegion] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);

  const focusLocation = useCallback((value: string) => {
    setHoveredRegion(value);
    setFocusRegion(value);
    setFocusToken((token) => token + 1);
  }, []);

  const baseLabels = useMemo(
    () => ({
      resourcemanager_datumapis_com_project_name: projectId,
      gateway_name: proxyId,
      gateway_namespace: 'default',
    }),
    [projectId, proxyId]
  );

  const matchSelector = useMemo(() => {
    const selector = buildPrometheusLabelSelector({
      baseLabels,
      customLabels: {
        [REGION_LABEL]: '!=""',
      },
    });
    return `${PROXY_METRIC}${selector}`;
  }, [baseLabels]);

  const { options: regionOptionsFromApi, error: metricsError } = usePrometheusLabels({
    label: REGION_LABEL,
    match: matchSelector,
    enabled: !!projectId && !!proxyId,
    filter: (v) => !!v?.trim(),
    sort: (a, b) => a.label.localeCompare(b.label),
  });

  const metricsEnabled = !!projectId && !!proxyId;

  const { data: rpsData } = usePrometheusChart({
    query: buildRateQuery({
      metric: PROXY_METRIC,
      timeWindow: '5m',
      baseLabels,
      customLabels: { [REGION_LABEL]: '!=""' },
      groupBy: [REGION_LABEL],
    }),
    enabled: metricsEnabled,
  });

  const { data: errorData } = usePrometheusChart({
    query: buildRateQuery({
      metric: PROXY_METRIC,
      timeWindow: '5m',
      baseLabels,
      customLabels: {
        [REGION_LABEL]: '!=""',
        envoy_response_code: '=~"5.."',
      },
      groupBy: [REGION_LABEL],
    }),
    enabled: metricsEnabled,
  });

  const { data: latencyData } = usePrometheusChart({
    query: buildHistogramQuantileQuery({
      quantile: 0.95,
      metric: LATENCY_METRIC,
      timeWindow: '5m',
      baseLabels,
      customLabels: { [REGION_LABEL]: '!=""' },
      groupBy: ['le', REGION_LABEL],
    }),
    enabled: metricsEnabled,
  });

  const { hasPermission: canViewLocations, isLoading: locationsPermissionLoading } = usePermission(
    'locations',
    'list',
    {
      group: 'locations.miloapis.com',
      scope: 'project',
      projectId,
      enabled: !!projectId,
    }
  );

  const projectionStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    projectionStartedAtRef.current = null;
  }, [projectId]);

  const {
    data: locations = [],
    isPending: locationsPending,
    isFetched: locationsFetched,
  } = useLocations(projectId, {
    enabled: !!projectId && canViewLocations,
    refetchInterval: (query) => {
      if ((query.state.data?.length ?? 0) > 0) {
        projectionStartedAtRef.current = null;
        return false;
      }
      if (query.state.status !== 'success') return LOCATION_PROJECTION_POLL_MS;
      if (projectionStartedAtRef.current == null) {
        projectionStartedAtRef.current = Date.now();
      }
      if (Date.now() - projectionStartedAtRef.current > LOCATION_PROJECTION_GIVE_UP_MS) {
        return false;
      }
      return LOCATION_PROJECTION_POLL_MS;
    },
  });

  useLocationsWatch(projectId, {
    enabled: !!projectId && canViewLocations,
  });

  const directory = useMemo(
    () =>
      buildLocationDirectory(
        locations,
        regionOptionsFromApi.map((option) => option.value)
      ),
    [regionOptionsFromApi, locations]
  );

  const regionsWithCoords = useMemo(
    () =>
      directory.filter(
        (pop): pop is typeof pop & { coords: [number, number] } => pop.coords !== null
      ),
    [directory]
  );

  const activeCount = directory.filter((item) => item.active).length;

  const { data: proxy } = useHttpProxy(projectId, proxyId, {
    enabled: !!projectId && !!proxyId,
  });

  const isProxyPending = useMemo(() => {
    if (!proxy?.status) return true;
    const transformedStatus = transformControlPlaneStatus(proxy.status);
    return transformedStatus.status === ControlPlaneStatus.Pending;
  }, [proxy?.status]);

  const isLocationsLoading = locationsPermissionLoading || (canViewLocations && locationsPending);

  const [projectionWindowOpen, setProjectionWindowOpen] = useState(false);

  useEffect(() => {
    if (!canViewLocations) return;
    if (locations.length > 0) {
      setProjectionWindowOpen(false);
      return;
    }
    if (!locationsFetched) return;

    setProjectionWindowOpen(true);
    const timeout = window.setTimeout(() => {
      setProjectionWindowOpen(false);
    }, LOCATION_PROJECTION_GIVE_UP_MS);
    return () => window.clearTimeout(timeout);
  }, [projectId, canViewLocations, locations.length, locationsFetched]);

  const showLocationSkeletons =
    isLocationsLoading || (directory.length === 0 && (isProxyPending || projectionWindowOpen));

  return (
    <Card className="relative h-full w-full overflow-hidden rounded-xl py-0 shadow">
      <CardContent className="p-0">
        <div className="relative h-[22rem] sm:h-[24rem]">
          <div className="absolute inset-y-0 right-0 hidden w-[58%] overflow-hidden sm:block">
            <ChunkErrorBoundary
              fallback={
                <div className="flex size-full items-center justify-center px-6">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground text-sm">Unable to load map.</p>
                    <Button
                      htmlType="button"
                      type="primary"
                      theme="solid"
                      size="small"
                      onClick={() => window.location.reload()}>
                      Reload page
                    </Button>
                  </div>
                </div>
              }>
              <div className="absolute top-1/2 right-0 size-[38rem] translate-x-[62%] -translate-y-1/2">
                <Suspense
                  fallback={<div className="bg-muted/20 size-full motion-safe:animate-pulse" />}>
                  <ActivePopsMap
                    regionsWithCoords={regionsWithCoords}
                    hoveredRegion={hoveredRegion}
                    onHoverRegion={setHoveredRegion}
                    onFocusRegion={focusLocation}
                    focusRegion={focusRegion}
                    focusToken={focusToken}
                    searching={showLocationSkeletons}
                  />
                </Suspense>
                <div
                  className={cn(
                    'pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out',
                    showLocationSkeletons ? 'opacity-100' : 'opacity-0'
                  )}
                  aria-hidden={!showLocationSkeletons}>
                  <div className="bg-primary/20 absolute top-[38%] left-[6%] size-28 rounded-full blur-3xl motion-safe:animate-pulse" />
                </div>
              </div>
            </ChunkErrorBoundary>
          </div>
          <div className="from-card from-card pointer-events-none absolute inset-y-0 left-0 hidden w-[34rem] bg-gradient-to-r from-[26rem] to-transparent sm:block" />

          <div className="bg-card relative z-10 flex h-full min-h-0 w-full flex-col gap-3 px-3 pt-4 pb-4 sm:max-w-[26rem] sm:bg-transparent sm:px-6 sm:pb-8">
            <div className="flex shrink-0 items-center gap-2.5">
              <Icon icon={MapPinIcon} size={20} className="text-secondary stroke-2" />
              <span className="text-base font-semibold">Active POPs</span>
            </div>
            <p className="text-muted-foreground shrink-0 text-sm font-normal">
              Locations this ALB can serve from. Highlighted locations have recent traffic.
            </p>
            {showLocationSkeletons && (
              <p className="text-muted-foreground shrink-0 text-xs" aria-live="polite">
                Discovering locations…
              </p>
            )}
            {!showLocationSkeletons && directory.length > 0 && (
              <p className="text-muted-foreground shrink-0 text-xs">
                {activeCount} with traffic · {directory.length} locations
              </p>
            )}
            {showLocationSkeletons && (
              <ul className="min-h-0 flex-1 overflow-hidden" aria-busy="true">
                <LocationRowSkeleton />
                <LocationRowSkeleton />
              </ul>
            )}
            {!showLocationSkeletons && metricsError && directory.length === 0 && (
              <p className="text-muted-foreground text-sm">Unable to load active regions.</p>
            )}
            {!showLocationSkeletons && !metricsError && directory.length === 0 && (
              <p className="text-muted-foreground text-sm">No locations found.</p>
            )}
            {!showLocationSkeletons && directory.length > 0 && (
              <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,black_calc(100%-1.25rem),transparent)] pb-4">
                {directory.map((item) => {
                  const metricKey = item.trafficRegion ?? item.value;
                  const rps = latestSeriesValue(seriesByRegion(rpsData?.series, metricKey));
                  const errorRps = latestSeriesValue(seriesByRegion(errorData?.series, metricKey));
                  const latency = latestSeriesValue(seriesByRegion(latencyData?.series, metricKey));
                  const isHovered = hoveredRegion === item.value;

                  return (
                    <li key={item.value}>
                      <button
                        type="button"
                        className={cn(
                          'hover:bg-foreground/[0.08] flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-150 ease-out',
                          isHovered && 'bg-foreground/[0.1]'
                        )}
                        onMouseEnter={() => setHoveredRegion(item.value)}
                        onMouseLeave={() => setHoveredRegion(null)}
                        onFocus={() => setHoveredRegion(item.value)}
                        onBlur={() => setHoveredRegion(null)}
                        onClick={() => {
                          if (item.coords) focusLocation(item.value);
                        }}>
                        <span
                          className={cn(
                            'mt-1.5 size-2 shrink-0 rounded-full',
                            item.active ? 'bg-[#B3D56F]' : 'bg-muted-foreground/30'
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{item.city}</span>
                            <Badge
                              type={item.active ? 'primary' : 'quaternary'}
                              theme={item.active ? 'light' : 'outline'}
                              className="shrink-0 text-[10px] font-normal">
                              {item.active ? 'Traffic' : 'Idle'}
                            </Badge>
                          </span>
                          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                            {item.subtitle}
                          </span>
                          <span className="text-muted-foreground mt-1 block text-xs tabular-nums">
                            {item.active
                              ? [
                                  formatRps(rps),
                                  formatLatency(latency),
                                  formatErrors(errorRps, rps),
                                ]
                                  .filter((part) => part !== '—')
                                  .join(' · ') || 'Collecting metrics…'
                              : 'No recent traffic'}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
