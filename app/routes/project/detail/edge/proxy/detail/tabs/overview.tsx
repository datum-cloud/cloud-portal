import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { PageTitle } from '@/components/page-title/page-title';
import { HttpProxyGeneralCard } from '@/features/edge/proxy/overview/general-card';
import { GrafanaSetupCard } from '@/features/edge/proxy/overview/grafana-setup-card';
import { HttpProxyHostnamesCard } from '@/features/edge/proxy/overview/hostnames-card';
import {
  HttpProxyFormDialog,
  type HttpProxyFormDialogRef,
} from '@/features/edge/proxy/proxy-form-dialog';
import {
  type HttpProxy,
  useDeleteHttpProxy,
  useHttpProxy,
  useHttpProxyWatch,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-ui/components';
import { Col, Row } from '@datum-ui/components';
import { useRef } from 'react';
import { useNavigate, useParams, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

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
      title: 'Delete Proxy',
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
    <>
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <PageTitle title={effectiveProxy.name ?? 'Proxy'} />
        </Col>
        <Col span={24}>
          <HttpProxyGeneralCard
            httpProxy={effectiveProxy}
            onEdit={() => proxyFormRef.current?.show(effectiveProxy)}
          />
        </Col>
        <Col span={12}>
          <HttpProxyHostnamesCard
            endpoint={effectiveProxy?.endpoint}
            customHostnames={effectiveProxy?.hostnames ?? []}
            status={effectiveProxy?.status}
          />
        </Col>
        <Col span={12}>
          <GrafanaSetupCard projectId={projectId ?? ''} />
        </Col>
        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete Proxy</h3>
          <DangerCard
            deleteText="Delete proxy"
            loading={deleteMutation.isPending}
            onDelete={deleteHttpProxy}
          />
        </Col>
      </Row>

      <HttpProxyFormDialog ref={proxyFormRef} projectId={projectId!} />
    </>
  );
}
