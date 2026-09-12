import { ActivePopsExpandOverlay } from './active-pops-expand-overlay';
import {
  formatErrors,
  formatLatency,
  formatRps,
  metricsForTrafficRegion,
} from './active-pops-metrics';
import { buildLocationDirectory } from './enrich-active-pops';
import { ChunkErrorBoundary } from '@/components/chunk-error-boundary/chunk-error-boundary';
import {
  buildHistogramQuantileQuery,
  buildPrometheusLabelSelector,
  buildRateQuery,
  usePrometheusChart,
  usePrometheusLabels,
} from '@/modules/metrics';
import { usePermission } from '@/modules/rbac';
import { ControlPlaneStatus } from '@/resources/base';
import { useHttpProxy } from '@/resources/http-proxies';
import { useLocations, useLocationsWatch } from '@/resources/locations';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { lazyWithRetry } from '@/utils/helpers/lazy-with-retry';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ExpandIcon, MapPinIcon } from 'lucide-react';
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
const INITIAL_GLOBE_ROTATION = { phi: -1.03, theta: 0.34 };

function LocationRowSkeleton() {
  return (
    <li>
      <div className="flex w-full items-center gap-3 px-(--card-px) py-2.5">
        <Skeleton className="size-2 shrink-0 rounded-full" />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </span>
        <Skeleton className="hidden h-1.5 w-28 rounded-full sm:block" />
        <span className="flex w-20 flex-col items-end gap-1.5">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-3 w-10" />
        </span>
      </div>
    </li>
  );
}

export const ActivePopsCard = ({
  projectId,
  proxyId,
  embedded = false,
}: {
  projectId: string;
  proxyId: string;
  /** Sit inside a parent section without a second card chrome. */
  embedded?: boolean;
}) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [focusRegion, setFocusRegion] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [cardGlobeHidden, setCardGlobeHidden] = useState(false);
  const [originRect, setOriginRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [globeRotation, setGlobeRotation] = useState(
    embedded ? { phi: 0.18, theta: 0.22 } : INITIAL_GLOBE_ROTATION
  );
  const globeRotationRef = useRef(globeRotation);
  globeRotationRef.current = globeRotation;
  const globeOriginRef = useRef<HTMLDivElement>(null);
  const cardBodyRef = useRef<HTMLDivElement>(null);

  const focusLocation = useCallback((value: string) => {
    setHoveredRegion(value);
    setFocusRegion(value);
    setFocusToken((token) => token + 1);
  }, []);

  const openExpanded = useCallback(() => {
    const globeRect = globeOriginRef.current?.getBoundingClientRect();
    const cardRect = cardBodyRef.current?.getBoundingClientRect();
    const rect = globeRect && globeRect.width > 0 && globeRect.height > 0 ? globeRect : cardRect;
    if (!rect) return;
    setGlobeRotation(globeRotationRef.current);
    setOriginRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    setExpanded(true);
  }, []);

  const closeExpanded = useCallback(() => {
    const globeRect = globeOriginRef.current?.getBoundingClientRect();
    const cardRect = cardBodyRef.current?.getBoundingClientRect();
    const rect = globeRect && globeRect.width > 0 && globeRect.height > 0 ? globeRect : cardRect;
    if (rect) {
      setOriginRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
    setExpanded(false);
  }, []);

  const handleOverlayEntered = useCallback(() => {
    setCardGlobeHidden(true);
  }, []);

  const handleOverlayExitStart = useCallback(() => {
    setCardGlobeHidden(false);
  }, []);

  const handleOverlayExited = useCallback(() => {
    setCardGlobeHidden(false);
    setGlobeRotation(globeRotationRef.current);
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
      directory
        .filter((pop): pop is typeof pop & { coords: [number, number] } => pop.coords !== null)
        .map((pop) => {
          const metricKey = pop.trafficRegion ?? pop.value;
          return {
            value: pop.value,
            city: pop.city,
            subtitle: pop.subtitle,
            coords: pop.coords,
            active: pop.active,
            metrics: metricsForTrafficRegion(
              metricKey,
              rpsData?.series,
              errorData?.series,
              latencyData?.series
            ),
          };
        }),
    [directory, rpsData?.series, errorData?.series, latencyData?.series]
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
  const canExpand = !showLocationSkeletons && regionsWithCoords.length > 0;

  const globeMap = (
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
      <Suspense fallback={<div className="bg-muted/20 size-full motion-safe:animate-pulse" />}>
        <ActivePopsMap
          variant={embedded ? 'expanded' : 'card'}
          persistentActiveTooltips={embedded}
          regionsWithCoords={regionsWithCoords}
          hoveredRegion={hoveredRegion}
          onHoverRegion={setHoveredRegion}
          onFocusRegion={focusLocation}
          focusRegion={focusRegion}
          focusToken={focusToken}
          initialPhi={globeRotation.phi}
          initialTheta={globeRotation.theta}
          onRotationChange={(phi, theta) => {
            globeRotationRef.current = { phi, theta };
          }}
          suspended={cardGlobeHidden}
          searching={showLocationSkeletons}
        />
      </Suspense>
    </ChunkErrorBoundary>
  );

  const renderExpandButton = (className?: string) =>
    canExpand ? (
      <Button
        htmlType="button"
        type="quaternary"
        theme="outline"
        size="small"
        aria-label="Expand map"
        className={cn(
          'bg-background/80 backdrop-blur-sm transition-transform duration-[160ms] ease-out active:scale-[0.97]',
          className
        )}
        onClick={openExpanded}>
        <Icon icon={ExpandIcon} size={14} />
      </Button>
    ) : null;

  const body = embedded ? (
    <div ref={cardBodyRef} className="relative h-[28rem] sm:h-[34rem] lg:h-[40rem]">
      <div
        ref={globeOriginRef}
        data-active-pops-globe-clip
        data-active-pops-globe-origin
        className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-200 ease-out',
            cardGlobeHidden ? 'pointer-events-none opacity-0' : 'opacity-100'
          )}>
          {globeMap}
          <div
            className={cn(
              'pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out',
              showLocationSkeletons ? 'opacity-100' : 'opacity-0'
            )}
            aria-hidden={!showLocationSkeletons}>
            <div className="bg-primary/20 absolute top-1/2 left-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="bg-background/80 inline-block rounded-lg px-3 py-2 backdrop-blur-sm">
          {showLocationSkeletons ? (
            <p className="text-muted-foreground text-xs" aria-live="polite">
              Discovering locations…
            </p>
          ) : metricsError && directory.length === 0 ? (
            <p className="text-muted-foreground text-xs">Unable to load active regions.</p>
          ) : directory.length === 0 ? (
            <p className="text-muted-foreground text-xs">No locations found.</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              {activeCount} with traffic · {directory.length} locations
            </p>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const maxRps = useMemo(() => {
    let max = 0;
    for (const item of directory) {
      if (!item.active) continue;
      const rps = metricsForTrafficRegion(
        item.trafficRegion ?? item.value,
        rpsData?.series,
        errorData?.series,
        latencyData?.series
      ).rps;
      if (rps != null && rps > max) max = rps;
    }
    return max;
  }, [directory, rpsData?.series, errorData?.series, latencyData?.series]);

  const locationRows = (
    <ul className="[&>li]:border-border [&>li]:border-b" data-active-pops-list>
      {directory.map((item) => {
        const metrics = metricsForTrafficRegion(
          item.trafficRegion ?? item.value,
          rpsData?.series,
          errorData?.series,
          latencyData?.series
        );
        const share = item.active && maxRps > 0 && metrics.rps != null ? metrics.rps / maxRps : 0;
        const isHovered = hoveredRegion === item.value;

        return (
          <li key={item.value}>
            <button
              type="button"
              className={cn(
                'hover:bg-muted/40 flex w-full items-center gap-3 px-(--card-px) py-2.5 text-left transition-colors duration-150 ease-out',
                isHovered && 'bg-muted/40'
              )}
              onMouseEnter={() => setHoveredRegion(item.value)}
              onMouseLeave={() => setHoveredRegion(null)}
              onFocus={() => setHoveredRegion(item.value)}
              onBlur={() => setHoveredRegion(null)}
              onClick={() => {
                if (item.coords) {
                  focusLocation(item.value);
                  if (canExpand) openExpanded();
                }
              }}>
              <span
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  item.active ? 'bg-(--color-badge-success)' : 'bg-muted-foreground/30'
                )}
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{item.city}</span>
                <span className="text-muted-foreground truncate text-xs">{item.subtitle}</span>
              </span>
              <span className="hidden w-28 shrink-0 items-center sm:flex">
                <span className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <span
                    className="bg-primary block h-full rounded-full transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.max(share * 100, item.active ? 4 : 0)}%` }}
                  />
                </span>
              </span>
              <span className="flex w-20 shrink-0 flex-col items-end">
                <span className="text-sm font-medium tabular-nums">
                  {item.active ? formatRps(metrics.rps) : '—'}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {item.active
                    ? formatLatency(metrics.latency) !== '—'
                      ? formatLatency(metrics.latency)
                      : formatErrors(metrics.errorRps, metrics.rps)
                    : 'Idle'}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const card = (
    <Card
      size="sm"
      sectioned
      data-active-pops-card
      className="relative flex h-full w-full flex-col overflow-hidden">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={MapPinIcon} size={16} className="text-secondary" />
          Traffic by location
        </CardTitle>
        <CardDescription className="text-xs" aria-live="polite">
          {showLocationSkeletons
            ? 'Discovering locations…'
            : directory.length === 0
              ? metricsError
                ? 'Unable to load active regions.'
                : 'No locations found.'
              : `${activeCount} of ${directory.length} POPs serving traffic`}
        </CardDescription>
        <CardAction>{renderExpandButton('h-7 px-2')}</CardAction>
      </CardHeader>
      <CardContent
        ref={cardBodyRef}
        padding="none"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {showLocationSkeletons ? (
          <ul className="divide-border divide-y" aria-busy="true">
            <LocationRowSkeleton />
            <LocationRowSkeleton />
            <LocationRowSkeleton />
          </ul>
        ) : directory.length === 0 ? (
          <p className="text-muted-foreground px-(--card-px) py-8 text-center text-sm">
            {metricsError ? 'Unable to load active regions.' : 'No locations found.'}
          </p>
        ) : (
          locationRows
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      {embedded ? (
        <div
          data-active-pops-card
          className="border-border/60 relative -mx-(--card-px) -mt-(--card-py) overflow-hidden border-b">
          {body}
        </div>
      ) : (
        card
      )}

      {!embedded && (
        <ActivePopsExpandOverlay
          open={expanded}
          originRect={originRect}
          regionsWithCoords={regionsWithCoords}
          rotation={globeRotation}
          onRotationChange={(phi, theta) => {
            globeRotationRef.current = { phi, theta };
          }}
          onClose={closeExpanded}
          onEntered={handleOverlayEntered}
          onExitStart={handleOverlayExitStart}
          onExited={handleOverlayExited}
          activeCount={activeCount}
          locationCount={directory.length}
        />
      )}
    </>
  );
};
