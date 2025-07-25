import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { routes } from '@/constants/routes';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { createNetworksControl } from '@/resources/control-plane/networks.control';
import { INetworkControlResponse } from '@/resources/interfaces/network.interface';
import { ROUTE_PATH as NETWORKS_ACTIONS_ROUTE_PATH } from '@/routes/api+/connect+/networks+/actions';
import { CustomError } from '@/utils/errorHandle';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from 'react-router';

export const loader = withMiddleware(async ({ params, context }) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const networksControl = createNetworksControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  const networks = await networksControl.list(projectId);

  return networks;
}, authMiddleware);

export default function ConnectNetworksPage() {
  const data = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();

  const { confirm } = useConfirmationDialog();
  const { orgId, projectId } = useParams();

  const deleteNetwork = async (network: INetworkControlResponse) => {
    await confirm({
      title: 'Delete Network',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{network.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await submit(
          {
            networkId: network.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'network-resources',
            navigate: false,
            action: NETWORKS_ACTIONS_ROUTE_PATH,
          }
        );
      },
    });
  };

  const columns: ColumnDef<INetworkControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <Link
              to={getPathWithParams(routes.projects.connect.networks.detail.overview, {
                orgId,
                projectId,
                networkId: row.original.name,
              })}
              className="text-primary font-semibold">
              {row.original.name}
            </Link>
          );
        },
      },
      {
        header: 'IP Family',
        accessorKey: 'ipFamily',
        cell: ({ row }) => {
          return (
            <div className="flex flex-wrap gap-1">
              {row.original.ipFamilies?.map((ipFamily) => (
                <Badge key={ipFamily} variant={ipFamily === 'IPv4' ? 'outline' : 'default'}>
                  {ipFamily}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        header: 'IPAM Mode',
        accessorKey: 'ipam',
        cell: ({ row }) => {
          return <div>{row.original.ipam?.mode}</div>;
        },
      },
      {
        header: 'MTU',
        accessorKey: 'mtu',
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

  const rowActions: DataTableRowActionsProps<INetworkControlResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(routes.projects.connect.networks.detail.edit, {
              orgId,
              projectId,
              networkId: row.name,
            })
          );
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteNetwork(row),
      },
    ],
    [orgId, projectId]
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      emptyContent={{
        title: 'No networks found.',
        subtitle: 'Create your first network to get started.',
        actions: [
          {
            type: 'link',
            label: 'New Network',
            to: getPathWithParams(routes.projects.connect.networks.new, { orgId, projectId }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'Networks',
        description: 'Manage deployment networks for your project resources',
        actions: (
          <Link
            to={getPathWithParams(routes.projects.connect.networks.new, {
              orgId,
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New Network
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  );
}
