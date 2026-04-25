import { DangerCard } from '@/components/danger-card/danger-card';
import { useDeleteProxy } from '@/features/edge/proxy/hooks/use-delete-proxy';
import { HttpProxyEdgeRequests } from '@/features/edge/proxy/metrics/edge-requests';
import { HttpProxyWafEvents } from '@/features/edge/proxy/metrics/waf-events';
import { ActivePopsCard } from '@/features/edge/proxy/overview/active-pops-card';
import { HttpProxyConfigCard } from '@/features/edge/proxy/overview/config-card';
import { HttpProxyGeneralCard } from '@/features/edge/proxy/overview/general-card';
import { HttpProxyHostnamesCard } from '@/features/edge/proxy/overview/hostnames-card';
import { HttpProxyOriginsCard } from '@/features/edge/proxy/overview/origins-card';
import { MetricsProvider } from '@/modules/metrics';
import { type HttpProxy, useHttpProxy, useHttpProxyWatch } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { toast } from '@datum-cloud/datum-ui/toast';
import { ChartSplineIcon, Trash2Icon } from 'lucide-react';
import { useNavigate, useParams, useRouteLoaderData } from 'react-router';

export default function HttpProxyDetailPage() {
  const loaderData = useRouteLoaderData('proxy-detail') as HttpProxy | undefined;
  const { projectId, proxyId } = useParams();
  const navigate = useNavigate();

  const { data: httpProxy } = useHttpProxy(projectId ?? '', proxyId ?? '', {
    initialData: loaderData,
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  useHttpProxyWatch(projectId ?? '', proxyId ?? '');

  const effectiveProxy = httpProxy ?? loaderData;

  const { confirmDelete, isPending: isDeleting } = useDeleteProxy(projectId ?? '', {
    onSuccess: () => {
      navigate(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete proxy');
    },
  });

  if (!effectiveProxy) return null;

  return (
    <MetricsProvider>
      <Row type="flex" gutter={[24, 32]}>
        <Col span={24}>
          <div className="flex items-center justify-between">
            <PageTitle title={effectiveProxy.chosenName ?? effectiveProxy.name ?? 'AI Edge'} />
            <Button
              type="danger"
              theme="outline"
              size="small"
              loading={isDeleting}
              onClick={() => confirmDelete(effectiveProxy)}>
              <Icon icon={Trash2Icon} size={14} />
              Delete
            </Button>
          </div>
        </Col>
        <Col span={24} lg={12}>
          <HttpProxyGeneralCard proxy={effectiveProxy} />
        </Col>
        <Col span={24} lg={12}>
          <HttpProxyConfigCard proxy={effectiveProxy} projectId={projectId} />
        </Col>
        <Col span={24} lg={12}>
          <HttpProxyHostnamesCard proxy={effectiveProxy} projectId={projectId} />
        </Col>
        <Col span={24} lg={12}>
          <HttpProxyOriginsCard proxy={effectiveProxy} projectId={projectId} />
        </Col>
        <Col span={24}>
          <ActivePopsCard projectId={projectId ?? ''} proxyId={effectiveProxy.name ?? ''} />
        </Col>

        <Col span={24}>
          <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow-none sm:pt-6 sm:pb-4">
            <CardContent className="flex flex-col gap-5 p-0 sm:px-6 sm:pb-4">
              <div className="flex items-center gap-2.5">
                <Icon icon={ChartSplineIcon} size={20} className="text-secondary stroke-2" />
                <span className="text-base font-semibold">Metrics</span>
              </div>
              <HttpProxyEdgeRequests projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
              {effectiveProxy.trafficProtectionMode &&
                effectiveProxy.trafficProtectionMode !== 'Disabled' && (
                  <>
                    <HttpProxyWafEvents
                      projectId={projectId ?? ''}
                      proxyId={proxyId ?? ''}
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
          />
        </Col>
      </Row>
    </MetricsProvider>
  );
}
