import { enrichActivePops } from './enrich-active-pops';
import { ChunkErrorBoundary } from '@/components/chunk-error-boundary/chunk-error-boundary';
import { usePrometheusLabels } from '@/modules/metrics';
import { buildPrometheusLabelSelector } from '@/modules/metrics/utils/query-builders';
import { usePermission } from '@/modules/rbac';
import { ControlPlaneStatus } from '@/resources/base';
import { useHttpProxy } from '@/resources/http-proxies';
import { useLocations } from '@/resources/locations';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { lazyWithRetry } from '@/utils/helpers/lazy-with-retry';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { MapPinIcon } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';

const ActivePopsMap = lazyWithRetry(
  () => import('./active-pops-map').then((m) => ({ default: m.ActivePopsMap })),
  'active-pops-map'
);

const REGION_LABEL = 'label_topology_kubernetes_io_region';
const PROXY_METRIC = 'envoy_vhost_vcluster_upstream_rq';

export const ActivePopsCard = ({ projectId, proxyId }: { projectId: string; proxyId: string }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const matchSelector = useMemo(() => {
    const selector = buildPrometheusLabelSelector({
      baseLabels: {
        resourcemanager_datumapis_com_project_name: projectId,
        gateway_name: proxyId,
        gateway_namespace: 'default',
      },
      customLabels: {
        [REGION_LABEL]: '!=""',
      },
    });
    return `${PROXY_METRIC}${selector}`;
  }, [projectId, proxyId]);

  const {
    options: regionOptionsFromApi,
    isLoading,
    error,
  } = usePrometheusLabels({
    label: REGION_LABEL,
    match: matchSelector,
    enabled: !!projectId && !!proxyId,
    filter: (v) => !!v?.trim(),
    sort: (a, b) => a.label.localeCompare(b.label),
  });

  const { hasPermission: canViewLocations } = usePermission('locations', 'list', {
    group: 'locations.miloapis.com',
    scope: 'project',
    projectId,
    enabled: !!projectId,
  });

  const { data: locations = [] } = useLocations(projectId, {
    enabled: !!projectId && canViewLocations,
  });

  const activePops = useMemo(
    () =>
      enrichActivePops(
        regionOptionsFromApi.map((option) => option.value),
        locations
      ),
    [regionOptionsFromApi, locations]
  );

  const regionsWithCoords = useMemo(
    () =>
      activePops.filter(
        (pop): pop is typeof pop & { coords: [number, number] } => pop.coords !== null
      ),
    [activePops]
  );

  const { data: proxy } = useHttpProxy(projectId, proxyId, {
    enabled: !!projectId && !!proxyId,
  });

  const isProxyPending = useMemo(() => {
    if (!proxy?.status) return true;
    const transformedStatus = transformControlPlaneStatus(proxy.status);
    return transformedStatus.status === ControlPlaneStatus.Pending;
  }, [proxy?.status]);

  const showSkeleton = isProxyPending && !isLoading && activePops.length === 0 && !error;

  return (
    <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="flex flex-col gap-5 p-0 sm:px-6 sm:pb-4">
        <div className="flex items-center gap-2.5">
          <Icon icon={MapPinIcon} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">Active POPs</span>
        </div>
        <p className="text-muted-foreground text-sm font-normal">
          Points of presence where this proxy is currently active, based on recent traffic metrics.
        </p>
        {isLoading && (
          <div className="bg-muted flex h-40 w-full items-center justify-center rounded-lg border sm:h-64">
            <div className="flex flex-col items-center gap-3">
              <SpinnerIcon size="lg" />
              <p className="text-muted-foreground text-sm">Loading active POPs...</p>
            </div>
          </div>
        )}
        {showSkeleton && <Skeleton className="h-40 w-full rounded-lg border sm:h-64" />}
        {!isLoading && !showSkeleton && !error && (
          <>
            <ChunkErrorBoundary
              fallback={
                <div className="bg-muted flex h-40 w-full items-center justify-center rounded-lg border sm:h-64">
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
              <Suspense
                fallback={
                  <div className="bg-muted aspect-[1038/591] w-full animate-pulse rounded-lg border" />
                }>
                <ActivePopsMap
                  regionsWithCoords={regionsWithCoords}
                  hoveredRegion={hoveredRegion}
                  onHoverRegion={setHoveredRegion}
                />
              </Suspense>
            </ChunkErrorBoundary>
            {activePops.length === 0 ? (
              <p className="text-muted-foreground text-sm">No active POPs found.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activePops.map((pop) => (
                  <Tooltip key={pop.value} message={pop.tooltip}>
                    <span
                      onMouseEnter={() => setHoveredRegion(pop.value)}
                      onMouseLeave={() => setHoveredRegion(null)}>
                      <Badge
                        type="quaternary"
                        theme="outline"
                        className={cn(
                          'rounded-xl text-xs font-normal',
                          hoveredRegion === pop.value && 'ring-primary/40 ring-1'
                        )}>
                        {pop.city}
                      </Badge>
                    </span>
                  </Tooltip>
                ))}
              </div>
            )}
          </>
        )}
        {!isLoading && !showSkeleton && error && (
          <div className="bg-muted flex h-40 w-full items-center justify-center rounded-lg border sm:h-64">
            <p className="text-muted-foreground text-center text-sm">
              Unable to load active regions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
