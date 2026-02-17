import { BadgeStatus } from '@/components/badge/badge-status';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
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
import { Button, toast } from '@datum-ui/components';
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
  return metaObject('Proxy');
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

  const deleteMutation = useDeleteHttpProxy(projectId ?? '', {
    onSuccess: () => {
      toast.success('Proxy', {
        description: 'The proxy has been deleted successfully',
      });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete proxy');
    },
  });

  const deleteHttpProxy = async (httpProxy: HttpProxy) => {
    await confirm({
      title: 'Delete Proxy',
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
        header: 'Resource Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.name}</span>;
        },
      },
      {
        header: 'Endpoint',
        accessorKey: 'endpoint',
        cell: ({ row }) => {
          return row.original.endpoint;
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
          title: "let's add a Proxy to get you started",
          actions: [
            {
              type: 'button',
              label: 'Add proxy',
              onClick: () => proxyFormRef.current?.show(),
              variant: 'default',
              icon: <Icon icon={PlusIcon} className="size-3" />,
              iconPosition: 'start',
            },
          ],
        }}
        tableTitle={{
          title: 'Proxy',
          actions: (
            <Button
              type="primary"
              theme="solid"
              size="small"
              onClick={() => proxyFormRef.current?.show()}>
              <Icon icon={PlusIcon} className="size-4" />
              Add proxy
            </Button>
          ),
        }}
        toolbar={{
          layout: 'compact',
          includeSearch: {
            placeholder: 'Search proxies',
          },
        }}
        rowActions={rowActions}
      />

      <HttpProxyFormDialog ref={proxyFormRef} projectId={projectId!} />
    </>
  );
}
