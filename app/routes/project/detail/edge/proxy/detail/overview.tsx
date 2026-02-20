import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { HttpProxyGlobalUpstreamLatency } from '@/features/edge/proxy/metrics/global-upstream-latency';
import { HttpProxyUpstreamResponse } from '@/features/edge/proxy/metrics/upstream-response';
import { HttpProxyUpstreamRps } from '@/features/edge/proxy/metrics/upstream-rps';
import { ActivePopsCard } from '@/features/edge/proxy/overview/active-pops-card';
import { HttpProxyGeneralCard } from '@/features/edge/proxy/overview/general-card';
import { HttpProxyHostnamesCard } from '@/features/edge/proxy/overview/hostnames-card';
import { HttpProxyOriginsCard } from '@/features/edge/proxy/overview/origins-card';
import {
  HttpProxyFormDialog,
  type HttpProxyFormDialogRef,
} from '@/features/edge/proxy/proxy-form-dialog';
import { MetricsProvider, MetricsToolbar } from '@/modules/metrics';
import { RegionsFilter } from '@/modules/metrics/components/filters/regions-filter';
import {
  type HttpProxy,
  useDeleteHttpProxy,
  useHttpProxy,
  useHttpProxyWatch,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon, toast } from '@datum-ui/components';
import { Card, CardContent, Col, Row } from '@datum-ui/components';
import { PageTitle } from '@datum-ui/components/page-title';
import { ChartSplineIcon } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate, useParams, useRouteLoaderData } from 'react-router';

export default function HttpProxyOverviewPage() {
  const loaderData = useRouteLoaderData('proxy-detail') as HttpProxy | undefined;
  const { projectId, proxyId } = useParams();
  const navigate = useNavigate();

  // Live React Query data with SSR fallback
  const { data: httpProxy } = useHttpProxy(projectId ?? '', proxyId ?? '', {
    initialData: loaderData,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // Subscribe to real-time updates via SSE
  useHttpProxyWatch(projectId ?? '', proxyId ?? '');

  const proxyFormRef = useRef<HttpProxyFormDialogRef>(null);
  const { confirm } = useConfirmationDialog();

  const deleteMutation = useDeleteHttpProxy(projectId ?? '', {
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

  const deleteHttpProxy = async () => {
    await confirm({
      title: 'Delete Edge Endpoint',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{httpProxy?.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmValue: httpProxy?.name,
      confirmInputLabel: `Type "${httpProxy?.name}" to confirm.`,
      onSubmit: async () => {
        await deleteMutation.mutateAsync(httpProxy?.name ?? '');
      },
    });
  };

  const effectiveProxy = httpProxy ?? loaderData;

  if (!effectiveProxy) return null;

  return (
    <MetricsProvider>
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <PageTitle title={effectiveProxy.chosenName ?? effectiveProxy.name ?? 'AI Edge'} />
        </Col>
        <Col span={24}>
          <HttpProxyGeneralCard
            httpProxy={effectiveProxy}
            onEdit={() => proxyFormRef.current?.show(effectiveProxy)}
          />
        </Col>
        <Col span={24} lg={12}>
          <HttpProxyHostnamesCard
            customHostnames={effectiveProxy?.hostnames ?? []}
            status={effectiveProxy?.status}
            proxy={effectiveProxy}
            projectId={projectId}
          />
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
            loading={deleteMutation.isPending}
            onDelete={deleteHttpProxy}
          />
        </Col>
      </Row>

      <HttpProxyFormDialog ref={proxyFormRef} projectId={projectId!} />
    </MetricsProvider>
  );
}
