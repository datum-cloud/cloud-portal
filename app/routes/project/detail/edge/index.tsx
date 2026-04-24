import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { createActionsColumn, Table } from '@/components/table';
import { useDeleteProxy } from '@/features/edge/proxy/hooks/use-delete-proxy';
import { ProxySparkline } from '@/features/edge/proxy/metrics/proxy-sparkline';
import {
  HttpProxyFormDialog,
  type HttpProxyFormDialogRef,
} from '@/features/edge/proxy/proxy-form-dialog';
import { ControlPlaneStatus } from '@/resources/base';
import {
  type HttpProxy,
  useHttpProxies,
  useHttpProxiesWatch,
  formatWafProtectionDisplay,
  getCertificatesReadyCondition,
  getCertificatesReadyDisplay,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon, ShieldCheckIcon, ShieldOffIcon } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { MetaFunction, useNavigate, useParams, useSearchParams } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('AI Edge');
});

export default function HttpProxyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectId } = useParams();
  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }
  const navigate = useNavigate();

  useHttpProxiesWatch(projectId);

  const { data, isPending } = useHttpProxies(projectId, {
    refetchOnMount: false,
    staleTime: QUERY_STALE_TIME,
  });

  const proxyFormRef = useRef<HttpProxyFormDialogRef>(null);

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      proxyFormRef.current?.show();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { confirmDelete } = useDeleteProxy(projectId, {
    onError: (error) => {
      toast.error(error.message || 'Failed to delete AI Edge');
    },
  });

  const columns: ColumnDef<HttpProxy>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'chosenName',
        meta: { className: 'min-w-32' },
        cell: ({ row }) => {
          return (
            <div data-e2e="ai-edge-card">
              <Tooltip message={row.original.name || row.original.chosenName}>
                <span className="font-medium" data-e2e="ai-edge-name">
                  {row.original.chosenName || row.original.name}
                </span>
              </Tooltip>
            </div>
          );
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          if (!row.original.status) return null;
          const transformedStatus = transformControlPlaneStatus(row.original.status);
          const certCondition = getCertificatesReadyCondition(row.original?.status);
          const certDisplay = getCertificatesReadyDisplay(certCondition);
          return (
            <div className="flex items-center gap-2">
              <BadgeStatus
                status={transformedStatus}
                label={
                  transformedStatus.status === ControlPlaneStatus.Success ? 'Active' : undefined
                }
              />
              {certDisplay === 'ready' && (
                <Tooltip
                  message="All hostnames have valid TLS certificates and are secure"
                  side="top"
                  contentClassName="max-w-xs text-wrap">
                  <span className="text-primary inline-flex items-center">
                    <Icon icon={ShieldCheckIcon} size={18} className="shrink-0" />
                  </span>
                </Tooltip>
              )}
              {(certDisplay === 'pending' || certDisplay === 'failed') && (
                <Tooltip
                  message={
                    certCondition?.message ||
                    'One or more hostnames do not have a valid TLS certificate yet'
                  }
                  side="top"
                  contentClassName="max-w-xs text-wrap">
                  <span className="text-destructive inline-flex items-center">
                    <Icon icon={ShieldOffIcon} size={16} className="shrink-0" />
                  </span>
                </Tooltip>
              )}
            </div>
          );
        },
      },
      {
        header: 'Edge Activity',
        accessorKey: 'activity',
        enableSorting: false,
        meta: { tooltip: 'Traffic activity over the last hour to this edge' },
        cell: ({ row }) => {
          return <ProxySparkline projectId={projectId ?? ''} proxyId={row.original.name} />;
        },
      },
      {
        header: 'Origin',
        accessorKey: 'origin',
        meta: { tooltip: 'Upstream origin URL' },
        cell: ({ row }) => {
          return row.original.endpoint;
        },
      },
      {
        header: 'Hostnames',
        accessorKey: 'hostnames',
        meta: { tooltip: 'Verified hostnames that are pointing to your origin' },
        cell: ({ row }) => {
          const hostnames = row.original.status?.hostnames;
          const hasMultipleHostnames = (hostnames?.length ?? 0) > 1;
          return (
            <div className="flex gap-2">
              {hostnames?.map((hostname: string) => (
                <BadgeCopy
                  key={hostname}
                  value={`https://${hostname}`}
                  text={hostname}
                  badgeTheme="solid"
                  badgeType="muted"
                  textClassName={hasMultipleHostnames ? 'max-w-[10rem] truncate' : undefined}
                  showTooltip={false}
                  wrapperTooltipMessage={hostname}
                />
              ))}
            </div>
          );
        },
      },
      {
        header: 'Protection',
        accessorKey: 'trafficProtectionMode',
        meta: { tooltip: 'What level of WAF protection is applied to this Edge' },
        cell: ({ row }) => {
          return (
            <Badge
              type="quaternary"
              theme="outline"
              className="rounded-xl text-xs font-normal capitalize">
              {formatWafProtectionDisplay(row.original)}
            </Badge>
          );
        },
      },

      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateTime date={row.original.createdAt} />;
        },
      },
      createActionsColumn<HttpProxy>([
        {
          label: 'View',
          onClick: (row) => {
            navigate(
              getPathWithParams(paths.project.detail.proxy.detail.root, {
                projectId,
                proxyId: row.name,
              })
            );
          },
        },
        {
          label: 'Delete',
          variant: 'destructive',
          onClick: (row) => confirmDelete(row),
        },
      ]),
    ],
    [projectId, navigate, confirmDelete]
  );

  return (
    <>
      <Table.Client
        columns={columns}
        data={data ?? []}
        loading={isPending}
        title="AI Edge"
        onRowClick={(row) => {
          navigate(
            getPathWithParams(paths.project.detail.proxy.detail.root, {
              projectId,
              proxyId: row.name,
            })
          );
        }}
        description="Give every agent or app a global edge to absorb attacks, interact with the broader internet, and safely route traffic to backend services."
        search="Search"
        empty={{
          title: "let's add an AI Edge to get you started",
          actions: [
            {
              type: 'button',
              label: 'New',
              onClick: () => proxyFormRef.current?.show(),
              icon: <Icon icon={PlusIcon} className="size-3" />,
            },
          ],
        }}
        actions={[
          <Button
            key="create-edge"
            type="primary"
            theme="solid"
            size="small"
            className="w-full sm:w-auto"
            data-e2e="create-ai-edge-button"
            onClick={() => proxyFormRef.current?.show()}>
            <Icon icon={PlusIcon} className="size-4" />
            New
          </Button>,
        ]}
      />

      <HttpProxyFormDialog ref={proxyFormRef} projectId={projectId!} />
    </>
  );
}
