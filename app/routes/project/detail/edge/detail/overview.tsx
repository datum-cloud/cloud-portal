import { DangerCard } from '@/components/danger-card/danger-card';
import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { useDeleteProxy } from '@/features/edge/proxy/hooks/use-delete-proxy';
import { HttpProxyEdgeRequests } from '@/features/edge/proxy/metrics/edge-requests';
import { HttpProxyWafEvents } from '@/features/edge/proxy/metrics/waf-events';
import { ActivePopsCard } from '@/features/edge/proxy/overview/active-pops-card';
import { HttpProxyConfigCard } from '@/features/edge/proxy/overview/config-card';
import { HttpProxyGeneralCard } from '@/features/edge/proxy/overview/general-card';
import { HttpProxyHostnamesCard } from '@/features/edge/proxy/overview/hostnames-card';
import { HttpProxyOriginsCard } from '@/features/edge/proxy/overview/origins-card';
import { MetricsProvider } from '@/modules/metrics';
import { useGuardedRouteData, useResourcePermissions, usePermission } from '@/modules/rbac';
import {
  type HttpProxy,
  useHttpProxy,
  useHttpProxyWatch,
  useTrafficProtectionPolicy,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { NotFoundError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ChartSplineIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';

export default function HttpProxyOverviewPage() {
  const { data: proxy } = useGuardedRouteData<HttpProxy, Record<string, never>>('proxy-detail');
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();
  const navigate = useNavigate();

  const { data: httpProxy } = useHttpProxy(projectId, proxyId, {
    initialData: proxy,
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  useHttpProxyWatch(projectId, proxyId);

  const { canDelete, isLoading: deleteLoading } = useResourcePermissions({
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['delete'],
  });

  // WAF view permission is re-validated on every mount (staleTime 0) so the gate
  // never renders from a stale cached result. Documented escape hatch from
  // useResourcePermissions — see app/modules/rbac/use-resource-permissions.ts.
  const {
    hasPermission: canViewWaf,
    isLoading: wafPermLoading,
    isFetching: wafPermFetching,
  } = usePermission('trafficprotectionpolicies', 'get', {
    group: 'networking.datumapis.com',
    namespace: 'default',
    scope: 'project',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // WAF is fetched separately and only when viewable, then merged onto the proxy
  // so child cards/metrics keep reading `trafficProtectionMode` unchanged.
  const {
    data: waf,
    isError: wafError,
    isLoading: wafDataLoading,
    isFetching: wafDataFetching,
  } = useTrafficProtectionPolicy(projectId, proxyId, {
    staleTime: 0,
    refetchOnMount: 'always',
    enabled: canViewWaf,
    retry: false,
  });

  // Still resolving permission or WAF data (including mount re-validation) — let
  // the card show a skeleton instead of a possibly-stale verdict.
  const wafPending =
    wafPermLoading || wafPermFetching || (canViewWaf && (wafDataLoading || wafDataFetching));

  const baseProxy = httpProxy ?? proxy;
  const effectiveProxy = useMemo<HttpProxy | undefined>(
    () =>
      baseProxy
        ? { ...baseProxy, trafficProtectionMode: waf?.mode, paranoiaLevels: waf?.paranoiaLevels }
        : baseProxy,
    [baseProxy, waf]
  );

  const { confirmDelete, isPending: isDeleting } = useDeleteProxy(projectId, {
    onSuccess: () => {
      navigate(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete proxy');
    },
  });

  if (!effectiveProxy) throw new NotFoundError('AI Edge', proxyId);

  return (
    <MetricsProvider>
      <Row type="flex" gutter={[24, 32]}>
        <Col span={24} lg={12}>
          <HttpProxyGeneralCard proxy={effectiveProxy} />
        </Col>
        <Col span={24} lg={12}>
          <HttpProxyConfigCard
            proxy={effectiveProxy}
            projectId={projectId}
            canViewWaf={canViewWaf && !wafError}
            wafPending={wafPending}
          />
        </Col>
        <Col span={24} lg={12}>
          <HttpProxyHostnamesCard proxy={effectiveProxy} projectId={projectId} />
        </Col>
        <Col span={24} lg={12}>
          <HttpProxyOriginsCard proxy={effectiveProxy} projectId={projectId} />
        </Col>
        <Col span={24}>
          <ActivePopsCard projectId={projectId} proxyId={effectiveProxy.name ?? ''} />
        </Col>

        <Col span={24}>
          <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow-none sm:pt-6 sm:pb-4">
            <CardContent className="flex flex-col gap-5 p-0 sm:px-6 sm:pb-4">
              <div className="flex items-center gap-2.5">
                <Icon icon={ChartSplineIcon} size={20} className="text-secondary stroke-2" />
                <span className="text-base font-semibold">Metrics</span>
              </div>
              <HttpProxyEdgeRequests projectId={projectId} proxyId={proxyId} />
              {effectiveProxy.trafficProtectionMode &&
                effectiveProxy.trafficProtectionMode !== 'Disabled' && (
                  <>
                    <HttpProxyWafEvents
                      projectId={projectId}
                      proxyId={proxyId}
                      trafficProtectionMode={effectiveProxy.trafficProtectionMode}
                    />
                  </>
                )}
            </CardContent>
          </Card>
        </Col>
        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete AI Edge</h3>
          <DangerCard
            deleteText="Delete AI Edge"
            loading={isDeleting}
            onDelete={() => confirmDelete(effectiveProxy)}
            data-e2e="delete-ai-edge-button"
            actionHidden={deleteLoading || !canDelete}>
            {deleteLoading ? (
              <LoaderOverlay />
            ) : (
              !canDelete && (
                <RestrictedOverlay message="You don't have permission to delete this AI Edge" />
              )
            )}
          </DangerCard>
        </Col>
      </Row>
    </MetricsProvider>
  );
}
