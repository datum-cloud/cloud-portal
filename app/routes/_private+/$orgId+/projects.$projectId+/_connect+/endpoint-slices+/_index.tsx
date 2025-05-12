import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { routes } from '@/constants/routes'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { createEndpointSlicesControl } from '@/resources/control-plane/endpoint-slices.control'
import { IEndpointSliceControlResponseLite } from '@/resources/interfaces/endpoint-slice.interface'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { Client } from '@hey-api/client-axios'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import {
  AppLoadContext,
  LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from 'react-router'

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params
  const { controlPlaneClient } = context as AppLoadContext
  const endpointSlicesControl = createEndpointSlicesControl(controlPlaneClient as Client)

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const endpointSlices = await endpointSlicesControl.list(projectId)
  return endpointSlices
}

export default function ConnectEndpointSlicesPage() {
  const { orgId, projectId } = useParams()
  const data = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const navigate = useNavigate()

  const { confirm } = useConfirmationDialog()

  const deleteEndpointSlice = async (
    endpointSlice: IEndpointSliceControlResponseLite,
  ) => {
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
      confirmInputLabel: `Type "${endpointSlice.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the endpoint slice name to confirm deletion',
      confirmValue: endpointSlice.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            id: endpointSlice.name ?? '',
            projectId: projectId ?? '',
            orgId: orgId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'http-route-resources',
            navigate: false,
            // action: GATEWAYS_ACTIONS_PATH,
          },
        )
      },
    })
  }

  const columns: ColumnDef<IEndpointSliceControlResponseLite>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="text-primary font-semibold">{row.original.name}</span>
        },
      },
      {
        header: 'Address Type',
        accessorKey: 'addressType',
        cell: ({ row }) => {
          return row.original.addressType
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />
        },
      },
    ],
    [orgId, projectId],
  )

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rowActions: DataTableRowActionsProps<IEndpointSliceControlResponseLite>[] =
    useMemo(
      () => [
        {
          key: 'edit',
          label: 'Edit',
          action: (row) => {
            navigate(
              getPathWithParams(routes.projects.connect.endpointSlices.edit, {
                orgId,
                projectId,
                endpointSliceId: row.name,
              }),
            )
          },
        },
        {
          key: 'delete',
          label: 'Delete',
          variant: 'destructive',
          action: (row) => deleteEndpointSlice(row),
        },
      ],
      [orgId, projectId],
    )

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      className="mx-auto max-w-(--breakpoint-xl)"
      loadingText="Loading..."
      emptyText="No endpoint slices found."
      tableTitle={{
        title: 'Endpoint Slices',
        description: 'Manage endpoint slices for your project resources',
        /* actions: (
          <Link
            to={getPathWithParams(routes.projects.connect.endpointSlices.new, {
              orgId,
              projectId,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New HTTP Route
            </Button>
          </Link>
        ), */
      }}
      rowActions={[]}
    />
  )
}
