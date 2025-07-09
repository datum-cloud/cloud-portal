import { DataTable } from '@/components/data-table/data-table';
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types';
import { DateFormat } from '@/components/date-format/date-format';
import { Button } from '@/components/ui/button';
import { routes } from '@/constants/routes';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { createEndpointSlicesControl } from '@/resources/control-plane/endpoint-slices.control';
import { IEndpointSliceControlResponseLite } from '@/resources/interfaces/endpoint-slice.interface';
import { ROUTE_PATH as ENDPOINT_SLICES_ACTIONS_PATH } from '@/routes/api+/connect+/endpoint-slices+/actions';
import { CustomError } from '@/utils/errorHandle';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
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
  const endpointSlicesControl = createEndpointSlicesControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new CustomError('Project ID is required', 400);
  }

  const endpointSlices = await endpointSlicesControl.list(projectId);
  return endpointSlices;
};

export default function ConnectEndpointSlicesPage() {
  const { orgId, projectId } = useParams();
  const data = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigate = useNavigate();

  const { confirm } = useConfirmationDialog();

  const deleteEndpointSlice = async (endpointSlice: IEndpointSliceControlResponseLite) => {
    await confirm({
      title: 'Delete Endpoint Slice',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{endpointSlice.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await submit(
          {
            id: endpointSlice.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'endpoint-slices-resources',
            navigate: false,
            action: ENDPOINT_SLICES_ACTIONS_PATH,
          }
        );
      },
    });
  };

  const columns: ColumnDef<IEndpointSliceControlResponseLite>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <Link
              to={getPathWithParams(routes.projects.connect.endpointSlices.edit, {
                orgId,
                projectId,
                endpointId: row.original.name,
              })}
              className="text-primary font-semibold">
              {row.original.name}
            </Link>
          );
        },
      },
      {
        header: 'Address Type',
        accessorKey: 'addressType',
        cell: ({ row }) => {
          return row.original.addressType;
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

  const rowActions: DataTableRowActionsProps<IEndpointSliceControlResponseLite>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(routes.projects.connect.endpointSlices.edit, {
              orgId,
              projectId,
              endpointId: row.name,
            })
          );
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteEndpointSlice(row),
      },
    ],
    [orgId, projectId]
  );

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      emptyContent={{
        title: 'No endpoint slices found.',
        subtitle: 'Create your first endpoint slice to get started.',
        actions: [
          {
            type: 'link',
            label: 'New Endpoint Slice',
            to: getPathWithParams(routes.projects.connect.endpointSlices.new, { orgId, projectId }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: 'Endpoint Slices',
        description: 'Manage endpoint slices for your project resources',
        actions: (
          <Link
            to={getPathWithParams(routes.projects.connect.endpointSlices.new, {
              orgId,
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New Endpoint Slice
            </Button>
          </Link>
        ),
      }}
      rowActions={rowActions}
    />
  );
}
