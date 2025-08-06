import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { TextCopy } from '@/components/text-copy/text-copy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { paths } from '@/config/paths';
import { GatewayStatus } from '@/features/connect/gateway/status';
import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import { createGatewaysControl } from '@/resources/control-plane/gateways.control';
import { IGatewayControlResponseLite } from '@/resources/interfaces/gateway.interface';
import { ROUTE_PATH as GATEWAYS_ACTIONS_PATH } from '@/routes/old/api+/connect+/gateways+/actions';
import { CustomError } from '@/utils/error';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { InfoIcon, PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from 'react-router';

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const gatewaysControl = createGatewaysControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  const gateways = await gatewaysControl.list(projectId);
  return gateways;
};

export default function ConnectGatewaysPage() {
  const { orgId, projectId } = useParams();
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigate = useNavigate();

  const { confirm } = useConfirmationDialog();

  const deleteGateway = async (gateway: IGatewayControlResponseLite) => {
    await confirm({
      title: 'Delete Gateway',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{gateway.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await submit(
          {
            id: gateway.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'gateway-resources',
            navigate: false,
            action: GATEWAYS_ACTIONS_PATH,
          }
        );
      },
    });
  };

  const columns: ColumnDef<IGatewayControlResponseLite>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <Link
              to={getPathWithParams(paths.projects.connect.gateways.edit, {
                orgId,
                projectId,
                gatewayId: row.original.name,
              })}
              className="text-primary font-semibold">
              {row.original.name}
            </Link>
          );
        },
      },
      {
        header: 'Gateway Class',
        accessorKey: 'gatewayClass',
      },
      {
        header: '# of Listeners',
        accessorKey: 'listeners',
        cell: ({ row }) => {
          return row.original.numberOfListeners ?? 0;
        },
      },
      {
        header: '# of Addresses',
        accessorKey: 'addresses',
        cell: ({ row }) => {
          return (
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex w-fit cursor-pointer items-center gap-1 data-[state=open]:underline">
                  <span>{row.original.addresses?.length ?? 0}</span>
                  <InfoIcon className="size-3" />
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="min-w-[500px] p-3"
                align="center"
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                }}>
                <div className="space-y-3">
                  {row.original.addresses?.map((address, idx) => (
                    <div
                      key={`${address.type}-${idx}`}
                      className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-2 py-0.5 text-xs">
                          {address.type}
                        </Badge>
                        <TextCopy value={address.value} className="font-mono text-xs break-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          );
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return (
            row.original.status && (
              <GatewayStatus
                currentStatus={transformControlPlaneStatus(row.original.status)}
                projectId={projectId}
                id={row.original.name}
                type="badge"
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

  const rowActions: DataTableRowActionsProps<IGatewayControlResponseLite>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(paths.projects.connect.gateways.edit, {
              orgId,
              projectId,
              gatewayId: row.name,
            })
          );
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteGateway(row),
      },
    ],
    [orgId, projectId]
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      emptyContent={{
        title: 'No gateways found.',
        subtitle: 'Create your first gateway to get started.',
        actions: [
          {
            type: 'link',
            label: 'New Gateway',
            to: getPathWithParams(paths.projects.connect.gateways.new, { orgId, projectId }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'Gateways',
        description: 'Manage gateways for your project resources',
        actions: (
          <Link
            to={getPathWithParams(paths.projects.connect.gateways.new, {
              orgId,
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New Gateway
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  );
}
