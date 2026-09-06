import { DangerCard } from '@/components/danger-card/danger-card';
import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { useAlbTrafficProtection } from '@/features/edge/proxy/hooks/use-alb-traffic-protection';
import { useDeleteProxy } from '@/features/edge/proxy/hooks/use-delete-proxy';
import { ActivePopsCard } from '@/features/edge/proxy/overview/active-pops-card';
import { HttpProxyConfigCard } from '@/features/edge/proxy/overview/config-card';
import { HttpProxyGeneralCard } from '@/features/edge/proxy/overview/general-card';
import { HttpProxyHostnamesCard } from '@/features/edge/proxy/overview/hostnames-card';
import { HttpProxyLogsCard } from '@/features/edge/proxy/overview/logs-card';
import { HttpProxyMetricsStrip } from '@/features/edge/proxy/overview/metrics-strip';
import { HttpProxyOriginsCard } from '@/features/edge/proxy/overview/origins-card';
import { MetricsProvider } from '@/modules/metrics';
import { useGuardedRouteData, useResourcePermissions } from '@/modules/rbac';
import { type HttpProxy, useHttpProxy, useHttpProxyWatch } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { NotFoundError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { toast } from '@datum-cloud/datum-ui/toast';
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

  const {
    canViewWaf,
    wafUnavailable,
    wafPending,
    wafProgrammed,
    wafProgrammedMessage,
    wafProgrammedReason,
    wafEnabled,
    effectiveProxy,
  } = useAlbTrafficProtection(projectId, proxyId, httpProxy ?? proxy);

  const { confirmDelete, isPending: isDeleting } = useDeleteProxy(projectId, {
    onSuccess: () => {
      navigate(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete proxy');
    },
  });

  if (!effectiveProxy) throw new NotFoundError('Application Load Balancer', proxyId);

  return (
    <Row type="flex" gutter={[24, 32]}>
      <Col span={24}>
        <HttpProxyMetricsStrip
          projectId={projectId}
          proxyId={effectiveProxy.name ?? proxyId}
          showWaf={wafEnabled}
          wafPending={wafPending}
        />
      </Col>
      <Col span={24} lg={12}>
        <HttpProxyGeneralCard proxy={effectiveProxy} />
      </Col>
      <Col span={24} lg={12}>
        <HttpProxyConfigCard
          proxy={effectiveProxy}
          projectId={projectId}
          canViewWaf={canViewWaf}
          wafUnavailable={wafUnavailable}
          wafPending={wafPending}
          wafProgrammed={wafProgrammed}
          wafProgrammedMessage={wafProgrammedMessage}
          wafProgrammedReason={wafProgrammedReason}
        />
      </Col>
      <Col span={24} lg={12}>
        <HttpProxyHostnamesCard proxy={effectiveProxy} projectId={projectId} />
      </Col>
      <Col span={24} lg={12}>
        <HttpProxyOriginsCard proxy={effectiveProxy} projectId={projectId} />
      </Col>
      <Col span={24} lg={12}>
        <MetricsProvider>
          <ActivePopsCard projectId={projectId} proxyId={effectiveProxy.name ?? ''} />
        </MetricsProvider>
      </Col>
      <Col span={24} lg={12}>
        <HttpProxyLogsCard />
      </Col>
      <Col span={24}>
        <h3 className="mb-4 text-base font-medium">Delete Application Load Balancer</h3>
        <DangerCard
          deleteText="Delete Application Load Balancer"
          loading={isDeleting}
          onDelete={() => confirmDelete(effectiveProxy)}
          data-e2e="delete-alb-button"
          actionHidden={deleteLoading || !canDelete}>
          {deleteLoading ? (
            <LoaderOverlay />
          ) : (
            !canDelete && (
              <RestrictedOverlay message="You don't have permission to delete this Application Load Balancer" />
            )
          )}
        </DangerCard>
      </Col>
    </Row>
  );
}
