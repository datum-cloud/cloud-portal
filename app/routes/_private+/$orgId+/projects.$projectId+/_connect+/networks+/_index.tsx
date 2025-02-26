import { DataTable } from '@/components/data-table/data-table'
import { DataTableRowActionsProps } from '@/components/data-table/data-table.types'
import { DateFormat } from '@/components/date-format/date-format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { routes } from '@/constants/routes'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider'
import { INetworkControlResponse } from '@/resources/interfaces/network.interface'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { ColumnDef } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import {
  ActionFunctionArgs,
  AppLoadContext,
  Link,
  useLoaderData,
  useNavigate,
  useParams,
  useSubmit,
} from 'react-router'
import { toast } from 'sonner'

export const loader = withMiddleware(async ({ params, context }) => {
  const { projectId } = params
  const { networksControl } = context

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const networks = await networksControl.getNetworks(projectId)

  return networks
}, authMiddleware)

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { networksControl } = context as AppLoadContext

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { networkId, projectId } = formData

      return await networksControl.deleteNetwork(projectId as string, networkId as string)
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)

export default function ProjectConnectNetworks() {
  const data = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const submit = useSubmit()

  const { confirm } = useConfirmationDialog()

  const { orgId, projectId } = useParams()

  const deleteNetwork = async (network: INetworkControlResponse) => {
    await confirm({
      title: 'Delete Network',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>
            {network.displayName} ({network.name})
          </strong>
          ?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${network.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the network name to confirm deletion',
      confirmValue: network.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            networkId: network.name ?? '',
            projectId: projectId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'network-resources',
            navigate: false,
          },
        )

        toast.success('Network deleted successfully')
      },
    })
  }

  const columns: ColumnDef<INetworkControlResponse>[] = [
    {
      header: 'Display Name',
      accessorKey: 'displayName',
      cell: ({ row }) => {
        return (
          <Link
            to={getPathWithParams(routes.projects.networks.edit, {
              orgId,
              projectId,
              networkId: row.original.name,
            })}
            className="font-semibold text-primary">
            {row.original.displayName || row.original.name}
          </Link>
        )
      },
    },
    {
      header: 'Name',
      accessorKey: 'name',
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
        )
      },
    },
    {
      header: 'IPAM Mode',
      accessorKey: 'ipam',
      cell: ({ row }) => {
        return <div>{row.original.ipam?.mode}</div>
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
        return row.original.createdAt && <DateFormat date={row.original.createdAt} />
      },
    },
  ]

  const rowActions: DataTableRowActionsProps<INetworkControlResponse>[] = [
    {
      key: 'edit',
      label: 'Edit',
      action: (row) => {
        navigate(
          getPathWithParams(routes.projects.networks.edit, {
            orgId,
            projectId,
            networkId: row.name,
          }),
        )
      },
    },
    {
      key: 'delete',
      label: 'Delete',
      variant: 'destructive',
      action: (row) => deleteNetwork(row),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      className="mx-auto max-w-screen-xl"
      loadingText="Loading networks..."
      emptyText="No networks found."
      tableTitle={{
        title: 'Networks',
        description: 'Manage deployment networks for your project resources',
        actions: (
          <Link
            to={getPathWithParams(routes.projects.networks.new, { orgId, projectId })}>
            <Button>
              <PlusIcon className="h-4 w-4" />
              New Network
            </Button>
          </Link>
        ),
      }}
      defaultSorting={[{ id: 'createdAt', desc: true }]}
      rowActions={rowActions}
    />
  )
}
