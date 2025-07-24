import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { StatusBadge } from '@/components/status-badge/status-badge';
import { Button } from '@/components/ui/button';
import { routes } from '@/constants/routes';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { createHttpProxiesControl } from '@/resources/control-plane/http-proxies.control';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { ROUTE_PATH as HTTP_PROXIES_ACTIONS_PATH } from '@/routes/api+/edge+/httpproxy+/actions';
import { CustomError } from '@/utils/errorHandle';
import { mergeMeta, metaObject } from '@/utils/meta';
import { transformControlPlaneStatus } from '@/utils/misc';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('HTTPProxy');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const httpProxiesControl = createHttpProxiesControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  const httpProxies = await httpProxiesControl.list(projectId);
  return httpProxies;
};

export default function EdgeHttpProxiesPage() {
  const { orgId, projectId } = useParams();
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
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
        await submit(
          {
            id: httpProxy.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'http-proxy-resources',
            navigate: false,
            action: HTTP_PROXIES_ACTIONS_PATH,
          }
        );
      },
    });
  };

  const columns: ColumnDef<IHttpProxyControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <Link
              to={getPathWithParams(routes.projects.internetEdge.httpProxy.detail.overview, {
                orgId,
                projectId,
                proxyId: row.original.name,
              })}>
              <span className="text-primary font-semibold">{row.original.name}</span>
            </Link>
          );
        },
      },
      {
        header: 'Endpoint',
        accessorKey: 'endpoint',
        cell: ({ row }) => {
          return (
            <Link to={row.original.endpoint ?? ''} target="_blank">
              {row.original.endpoint}
            </Link>
          );
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
                badgeClassName="px-0"
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
    [orgId, projectId]
  );

  const rowActions: DataTableRowActionsProps<IHttpProxyControlResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(routes.projects.internetEdge.httpProxy.detail.edit, {
              orgId,
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
    [orgId, projectId]
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      emptyContent={{
        title: 'No HTTPProxy found.',
        subtitle: 'Create your first http proxy to get started.',
        actions: [
          {
            type: 'link',
            label: 'New HTTPProxy',
            to: getPathWithParams(routes.projects.internetEdge.httpProxy.new, {
              orgId,
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
            to={getPathWithParams(routes.projects.internetEdge.httpProxy.new, {
              orgId,
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
