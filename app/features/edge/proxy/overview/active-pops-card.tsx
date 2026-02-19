import { getRegionCoordinates } from './region-coordinates';
import { usePrometheusLabels } from '@/modules/metrics';
import { buildPrometheusLabelSelector } from '@/modules/metrics/utils/query-builders';
import { ControlPlaneStatus } from '@/resources/base';
import { useHttpProxy } from '@/resources/http-proxies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { SpinnerIcon } from '@datum-ui/components';
import { Card, CardContent } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Skeleton } from '@shadcn/ui/skeleton';
import { MapPinIcon } from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';

const ActivePopsMap = lazy(() =>
  import('./active-pops-map').then((m) => ({ default: m.ActivePopsMap }))
);

const REGION_LABEL = 'label_topology_kubernetes_io_region';
const PROXY_METRIC = 'envoy_vhost_vcluster_upstream_rq';

export const ActivePopsCard = ({ projectId, proxyId }: { projectId: string; proxyId: string }) => {
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

  const regionOptions = regionOptionsFromApi;

  const regionsWithCoords = useMemo(() => {
    return regionOptions
      .map((opt) => ({
        ...opt,
        coords: getRegionCoordinates(opt.value),
      }))
      .filter((r): r is typeof r & { coords: [number, number] } => r.coords !== null);
  }, [regionOptions]);

  // Check if proxy is still being created (Pending status)
  const { data: proxy } = useHttpProxy(projectId, proxyId, {
    enabled: !!projectId && !!proxyId,
  });

  const isProxyPending = useMemo(() => {
    if (!proxy?.status) return true;
    const transformedStatus = transformControlPlaneStatus(proxy.status);
    return transformedStatus.status === ControlPlaneStatus.Pending;
  }, [proxy?.status]);

  // Show skeleton when proxy is pending and no POPs data yet
  const showSkeleton = isProxyPending && !isLoading && regionOptions.length === 0 && !error;

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
          <div className="bg-muted flex h-64 w-full items-center justify-center rounded-lg border">
            <div className="flex flex-col items-center gap-3">
              <SpinnerIcon size="lg" />
              <p className="text-muted-foreground text-sm">Loading active POPs...</p>
            </div>
          </div>
        )}
        {showSkeleton && <Skeleton className="h-64 w-full rounded-lg border" />}
        {!isLoading && !showSkeleton && !error && regionOptions.length > 0 && (
          <div className="flex flex-col gap-4">
            {regionsWithCoords.length > 0 && (
              <Suspense
                fallback={<div className="bg-muted h-64 animate-pulse rounded-lg border" />}>
                <ActivePopsMap regionsWithCoords={regionsWithCoords} />
              </Suspense>
            )}
            {regionsWithCoords.length === 0 && (
              <div className="bg-muted flex h-64 w-full items-center justify-center rounded-lg border">
                <p className="text-muted-foreground text-center text-sm">No active POPs found.</p>
              </div>
            )}
          </div>
        )}
        {!isLoading && !showSkeleton && (error || regionOptions.length === 0) && (
          <div className="bg-muted flex h-64 w-full items-center justify-center rounded-lg border">
            <p className="text-muted-foreground text-center text-sm">
              {error ? 'Unable to load active regions.' : 'No active POPs found.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
