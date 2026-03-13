import { DangerCard } from '@/components/danger-card/danger-card';
import { useDeleteProxy } from '@/features/edge/proxy/hooks/use-delete-proxy';
import { HttpProxyGlobalUpstreamLatency } from '@/features/edge/proxy/metrics/global-upstream-latency';
import { HttpProxyUpstreamResponse } from '@/features/edge/proxy/metrics/upstream-response';
import { HttpProxyUpstreamRps } from '@/features/edge/proxy/metrics/upstream-rps';
import { ActivePopsCard } from '@/features/edge/proxy/overview/active-pops-card';
import { HttpProxyConfigCard } from '@/features/edge/proxy/overview/config-card';
import { HttpProxyGeneralCard } from '@/features/edge/proxy/overview/general-card';
import { HttpProxyHostnamesCard } from '@/features/edge/proxy/overview/hostnames-card';
import { HttpProxyOriginsCard } from '@/features/edge/proxy/overview/origins-card';
import { MetricsProvider, MetricsToolbar } from '@/modules/metrics';
import { RegionsFilter } from '@/modules/metrics/components/filters/regions-filter';
import { ControlPlaneStatus } from '@/resources/base';
import { type HttpProxy, useHttpProxy, useHttpProxyWatch } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, Icon, toast, Tooltip } from '@datum-ui/components';
import { Card, CardContent, Col, Row } from '@datum-ui/components';
import { PageTitle } from '@datum-ui/components/page-title';
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
  const isDeleteDisabled =
    !!effectiveProxy &&
    transformControlPlaneStatus(effectiveProxy.status)?.status !== ControlPlaneStatus.Success;

  const { confirmDelete, isPending: isDeleting } = useDeleteProxy(projectId ?? '', {
    onSuccess: () => {
      toast.success('Proxy', {
        description: 'The proxy has been deleted successfully',
      });
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
            {isDeleteDisabled ? (
              <Tooltip message="Delete is available when the AI Edge is active">
                <Button
                  type="danger"
                  theme="outline"
                  size="small"
                  disabled
                  onClick={() => confirmDelete(effectiveProxy)}>
                  <Icon icon={Trash2Icon} size={14} />
                  Delete
                </Button>
              </Tooltip>
            ) : (
              <Button
                type="danger"
                theme="outline"
                size="small"
                loading={isDeleting}
                onClick={() => confirmDelete(effectiveProxy)}>
                <Icon icon={Trash2Icon} size={14} />
                Delete
              </Button>
            )}
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
          <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
            <CardContent className="flex flex-col gap-5 p-0 sm:px-6 sm:pb-4">
              <div className="flex items-center gap-2.5">
                <Icon icon={ChartSplineIcon} size={20} className="text-secondary stroke-2" />
                <span className="text-base font-semibold">Metrics</span>
              </div>
              <MetricsToolbar className="justify-between">
                <MetricsToolbar.Filters>
                  <RegionsFilter />
                </MetricsToolbar.Filters>
                <MetricsToolbar.CoreControls />
              </MetricsToolbar>
              <div className="flex flex-col gap-6">
                <HttpProxyGlobalUpstreamLatency
                  projectId={projectId ?? ''}
                  proxyId={proxyId ?? ''}
                />
                <Row gutter={[24, 24]}>
                  <Col span={24} lg={12}>
                    <HttpProxyUpstreamRps projectId={projectId ?? ''} proxyId={proxyId ?? ''} />
                  </Col>
                  <Col span={24} lg={12}>
                    <HttpProxyUpstreamResponse
                      projectId={projectId ?? ''}
                      proxyId={proxyId ?? ''}
                    />
                  </Col>
                </Row>
              </div>
            </CardContent>
          </Card>
        </Col>
        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete AI Edge</h3>
          <DangerCard
            deleteText="Delete AI Edge"
            loading={isDeleting}
            disabled={isDeleteDisabled}
            onDelete={() => confirmDelete(effectiveProxy)}
          />
        </Col>
      </Row>
    </MetricsProvider>
  );
}
