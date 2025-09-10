import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { StatusBadge } from '@/components/status-badge/status-badge';
import { Button } from '@/components/ui/button';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { createHttpProxiesControl } from '@/resources/control-plane/http-proxies.control';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { ROUTE_PATH as HTTP_PROXIES_ACTIONS_PATH } from '@/routes/api/httpproxy';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';
import { toast } from 'sonner';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('HTTPProxy');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const httpProxiesControl = createHttpProxiesControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const httpProxies = await httpProxiesControl.list(projectId);
  return httpProxies;
};

export default function HttpProxyPage() {
  const { projectId } = useParams();
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher({ key: 'delete-httpproxy' });
  const navigate = useNavigate();

  const { confirm } = useConfirmationDialog();

  const deleteHttpProxy = async (httpProxy: IHttpProxyControlResponse) => {
    await confirm({
      title: 'Delete HTTPProxy',
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
      onSubmit: async () => {
        await fetcher.submit(
          {
            id: httpProxy?.name ?? '',
            projectId: projectId ?? '',
          },
          {
            method: 'DELETE',
            action: HTTP_PROXIES_ACTIONS_PATH,
          }
        );
      },
    });
  };

  const columns: ColumnDef<IHttpProxyControlResponse>[] = useMemo(
    () => [
      {
        header: 'Resource Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="text-primary font-semibold">{row.original.name}</span>;
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
            row.original.status && (
              <StatusBadge
                status={transformControlPlaneStatus(row.original.status)}
                type="badge"
                readyText="Active"
              />
            )
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />;
        },
      },
    ],
    [projectId]
  );

  const rowActions: DataTableRowActionsProps<IHttpProxyControlResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(paths.project.detail.httpProxy.detail.edit, {
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
        action: (row) => deleteHttpProxy(row),
      },
    ],
    [projectId]
  );

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        toast.success('HTTPProxy deleted successfully');
      } else {
        toast.error(fetcher.data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      onRowClick={(row) => {
        navigate(
          getPathWithParams(paths.project.detail.httpProxy.detail.overview, {
            projectId,
            proxyId: row.name,
          })
        );
      }}
      emptyContent={{
        title: 'No HTTPProxy found.',
        subtitle: 'Create your first http proxy to get started.',
        actions: [
          {
            type: 'link',
            label: 'New HTTPProxy',
            to: getPathWithParams(paths.project.detail.httpProxy.new, {
              projectId,
            }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'HTTPProxy',
        description: 'Manage HTTPProxy for your project resources',
        actions: (
          <Link
            to={getPathWithParams(paths.project.detail.httpProxy.new, {
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New HTTPProxy
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  );
}
