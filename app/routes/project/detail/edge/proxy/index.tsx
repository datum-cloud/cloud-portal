import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { useDeleteProxy } from '@/features/edge/proxy/hooks/use-delete-proxy';
import { ProxySparkline } from '@/features/edge/proxy/metrics/proxy-sparkline';
import {
  HttpProxyFormDialog,
  type HttpProxyFormDialogRef,
} from '@/features/edge/proxy/proxy-form-dialog';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
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
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge, Button, toast, Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
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

  const { data, isLoading, error } = useHttpProxies(projectId, {
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
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
    onSuccess: () => {
      toast.success('AI Edge', {
        description: 'AI Edge has been deleted successfully',
      });
    },
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
            <Tooltip message={row.original.name || row.original.chosenName}>
              <span className="font-medium">{row.original.chosenName || row.original.name}</span>
            </Tooltip>
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
                  value={hostname}
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
    ],
    [projectId]
  );

  const rowActions: DataTableRowActionsProps<HttpProxy>[] = useMemo(
    () => [
      {
        key: 'view',
        label: 'View',
        action: (row) => {
          navigate(
            getPathWithParams(paths.project.detail.proxy.detail.root, {
              projectId,
              proxyId: row.name,
            })
          );
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        disabled: (row) => {
          const status = transformControlPlaneStatus(row.status);
          return status?.status !== ControlPlaneStatus.Success;
        },
        tooltip: (row) => {
          const status = transformControlPlaneStatus(row.status);
          return status?.status !== ControlPlaneStatus.Success
            ? 'Delete is available when the AI Edge is active'
            : undefined;
        },
        action: (row) => confirmDelete(row),
      },
    ],
    [projectId, confirmDelete]
  );

  return (
    <>
      <DataTable
        error={error}
        isLoading={isLoading}
        columns={columns}
        data={data ?? []}
        onRowClick={(row) => {
          navigate(
            getPathWithParams(paths.project.detail.proxy.detail.root, {
              projectId,
              proxyId: row.name,
            })
          );
        }}
        emptyContent={{
          title: "let's add an AI Edge to get you started",
          actions: [
            {
              type: 'button',
              label: 'New',
              onClick: () => proxyFormRef.current?.show(),
              variant: 'default',
              icon: <Icon icon={PlusIcon} className="size-3" />,
              iconPosition: 'start',
            },
          ],
        }}
        tableTitle={{
          title: 'AI Edge',
          actions: (
            <Button
              type="primary"
              theme="solid"
              size="small"
              onClick={() => proxyFormRef.current?.show()}>
              <Icon icon={PlusIcon} className="size-4" />
              New
            </Button>
          ),
        }}
        toolbar={{
          layout: 'compact',
          includeSearch: {
            placeholder: 'Search',
          },
        }}
        rowActions={rowActions}
      />

      <HttpProxyFormDialog ref={proxyFormRef} projectId={projectId!} />
    </>
  );
}
