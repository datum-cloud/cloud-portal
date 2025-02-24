import { withMiddleware } from '@/modules/middleware/middleware'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { CustomError } from '@/utils/errorHandle'
import { Link, useLoaderData, useParams } from 'react-router'
import { getPathWithParams } from '@/utils/path'
import { INetworkControlResponse } from '@/resources/interfaces/network.interface'
import { ColumnDef } from '@tanstack/react-table'
import { routes } from '@/constants/routes'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/data-table/data-table'
import { DateFormat } from '@/components/date-format/date-format'

export const loader = withMiddleware(async ({ params, context }) => {
  const { projectId } = params
  const { networksControl } = context

  if (!projectId) {
    throw new CustomError('Project ID is required', 400)
  }

  const networks = await networksControl.getNetworks(projectId)

  return networks
}, authMiddleware)

export default function ProjectConnectNetworks() {
  const data = useLoaderData<typeof loader>()

  const { orgId, projectId } = useParams()

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
              <Badge key={ipFamily} variant="outline">
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
      }}
      defaultSorting={[{ id: 'createdAt', desc: true }]}
    />
  )
}
