import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { ProxySparkline } from '@/features/edge/proxy/metrics/proxy-sparkline';
import {
  HttpProxyFormDialog,
  type HttpProxyFormDialogRef,
} from '@/features/edge/proxy/proxy-form-dialog';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import { ControlPlaneStatus } from '@/resources/base';
import {
  createHttpProxyService,
  type HttpProxy,
  useDeleteHttpProxy,
  useHttpProxies,
  useHydrateHttpProxies,
  useHttpProxiesWatch,
  formatWafProtectionDisplay,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge, Button, toast, Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';
import {
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('AI Edge');
});

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const httpProxyService = createHttpProxyService();
  const httpProxies = await httpProxyService.list(projectId);
  return httpProxies;
};

export default function HttpProxyPage() {
  const { projectId } = useParams();
  const initialData = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // Hydrate cache with SSR data (runs once on mount)
  useHydrateHttpProxies(projectId ?? '', initialData ?? []);

  // Subscribe to watch for real-time updates
  useHttpProxiesWatch(projectId ?? '');

  // Read from React Query cache (gets updates from watch!)
  const { data: queryData } = useHttpProxies(projectId ?? '', {
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000,
  });

  // Use React Query data, fallback to SSR data
  const data = queryData ?? initialData ?? [];

  const { confirm } = useConfirmationDialog();
  const proxyFormRef = useRef<HttpProxyFormDialogRef>(null);

  const deleteMutation = useDeleteHttpProxy(projectId ?? '', {
    onSuccess: () => {
      toast.success('AI Edge', {
        description: 'AI Edge has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete AI Edge');
    },
  });

  const deleteHttpProxy = async (httpProxy: HttpProxy) => {
    await confirm({
      title: 'Delete AI Edge',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{httpProxy.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmValue: httpProxy.name,
      confirmInputLabel: `Type "${httpProxy.name}" to confirm.`,
      onSubmit: async () => {
        await deleteMutation.mutateAsync(httpProxy.name);
      },
    });
  };

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
          return (
            row.original.status &&
            (() => {
              const transformedStatus = transformControlPlaneStatus(row.original.status);
              return (
                <BadgeStatus
                  status={transformedStatus}
                  label={
                    transformedStatus.status === ControlPlaneStatus.Success ? 'Active' : undefined
                  }
                />
              );
            })()
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
          const hostnames = row.original.status.hostnames?.map((hostname: string) => hostname);
          const hasMultipleHostnames = (hostnames?.length ?? 0) > 1;
          return (
            <div className="flex flex-wrap gap-2">
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
        key: 'edit',
        label: 'Edit',
        variant: 'default',
        action: (row) => proxyFormRef.current?.show(row),
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteHttpProxy(row),
      },
    ],
    [projectId]
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={data ?? []}
        onRowClick={(row) => {
          navigate(
            getPathWithParams(paths.project.detail.proxy.detail.overview, {
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
