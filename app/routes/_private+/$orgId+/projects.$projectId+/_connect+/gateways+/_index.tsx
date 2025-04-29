import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { GatewayStatus } from '@/features/connect/gateway/status'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { createGatewaysControl } from '@/resources/control-plane/gateways.control'
import { IGatewayControlResponse } from '@/resources/interfaces/gateway.interface'
import { ROUTE_PATH as GATEWAYS_ACTIONS_PATH } from '@/routes/api+/networks+/gateways+/actions'
import { CustomError } from '@/utils/errorHandle'
import { transformControlPlaneStatus } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { Client } from '@hey-api/client-axios'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  AppLoadContext,
  Link,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from 'react-router'

export const loader = withMiddleware(async ({ context, params }) => {
  const { projectId } = params
  const { controlPlaneClient } = context as AppLoadContext
  const gatewaysControl = createGatewaysControl(controlPlaneClient as Client)

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const gateways = await gatewaysControl.list(projectId)
  return gateways
}, authMiddleware)

export default function ConnectGatewaysPage() {
  const { orgId, projectId } = useParams()
  const data = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const navigate = useNavigate()

  const { confirm } = useConfirmationDialog()

  const deleteGateway = async (gateway: IGatewayControlResponse) => {
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
      confirmInputLabel: `Type "${gateway.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the gateway name to confirm deletion',
      confirmValue: gateway.name ?? 'delete',
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
          },
        )
      },
    })
  }

  const columns: ColumnDef<IGatewayControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <Link
              to={getPathWithParams(routes.projects.connect.gateways.edit, {
                orgId,
                projectId,
                gatewayId: row.original.name,
              })}
              className="text-primary font-semibold">
              {row.original.name}
            </Link>
          )
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
          return row.original.listeners?.length ?? 0
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
                badgeClassName="px-0"
              />
            )
          )
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

  const rowActions: DataTableRowActionsProps<IGatewayControlResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(routes.projects.connect.gateways.edit, {
              orgId,
              projectId,
              gatewayId: row.name,
            }),
          )
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteGateway(row),
      },
    ],
    [orgId, projectId],
  )

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      className="mx-auto max-w-(--breakpoint-lg)"
      loadingText="Loading..."
      emptyText="No gateways found."
      tableTitle={{
        title: 'Gateways',
        description: 'Manage gateways for your project resources',
        actions: (
          <Link
            to={getPathWithParams(routes.projects.connect.gateways.new, {
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
  )
}
