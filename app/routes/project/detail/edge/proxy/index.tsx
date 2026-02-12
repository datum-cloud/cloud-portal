import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import {
  ProxyAdvancedConfigDialog,
  type ProxyAdvancedConfigDialogRef,
} from '@/features/edge/proxy/proxy-advanced-config-dialog';
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
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, toast, Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ColumnDef } from '@tanstack/react-table';
import { GlobeIcon, PencilIcon, PlusIcon, TrashIcon, MonitorIcon } from 'lucide-react';
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
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000,
  });

  // Use React Query data, fallback to SSR data
  const data = queryData ?? initialData ?? [];

  const { confirm } = useConfirmationDialog();
  const proxyFormRef = useRef<HttpProxyFormDialogRef>(null);
  const advancedConfigRef = useRef<ProxyAdvancedConfigDialogRef>(null);

  const deleteMutation = useDeleteHttpProxy(projectId ?? '', {
    onSuccess: () => {
      toast.success('Edge', {
        description: 'The edge has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete edge');
    },
  });

  const deleteHttpProxy = async (httpProxy: HttpProxy) => {
    await confirm({
      title: 'Delete Edge',
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
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <Tooltip message={row.original.name || row.original.chosenName}>
                <span className="font-medium">{row.original.chosenName || row.original.name}</span>
              </Tooltip>
              {row.original.deviceName && (
                <Tooltip message={`${row.original.deviceName}`}>
                  <Icon icon={MonitorIcon} className="text-icon-primary size-4" />
                </Tooltip>
              )}
            </div>
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
        header: 'Origin',
        accessorKey: 'origin',
        cell: ({ row }) => {
          return row.original.endpoint;
        },
      },
      {
        header: 'Hostnames',
        accessorKey: 'hostnames',
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
        header: 'Protection Level',
        accessorKey: 'trafficProtectionMode',
        cell: ({ row }) => {
          return (
            <span className="capitalize">{row.original.trafficProtectionMode || 'Disabled'}</span>
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
        key: 'edit-hostnames',
        label: 'Edit hostnames',
        icon: <Icon icon={GlobeIcon} className="size-4" />,
        variant: 'default',
        action: (row) => advancedConfigRef.current?.show(row),
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: <Icon icon={PencilIcon} className="size-4" />,
        variant: 'default',
        action: (row) => proxyFormRef.current?.show(row),
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: <Icon icon={TrashIcon} className="size-4" />,
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
          title: "let's add an Edge endpoint to get you started",
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
      <ProxyAdvancedConfigDialog ref={advancedConfigRef} projectId={projectId!} />
    </>
  );
}
