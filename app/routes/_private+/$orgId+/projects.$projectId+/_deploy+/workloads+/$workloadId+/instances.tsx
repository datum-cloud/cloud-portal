import { DataTable } from '@/components/data-table/data-table'
import { DateFormat } from '@/components/date-format/date-format'
import { WorkloadStatus } from '@/features/workload/status'
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { IInstanceControlResponse } from '@/resources/interfaces/workload.interface'
import { CustomError } from '@/utils/errorHandle'
import { transformControlPlaneStatus } from '@/utils/misc'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { LoaderFunctionArgs, AppLoadContext, useLoaderData } from 'react-router'

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, workloadId } = params
  const { instancesControl, workloadsControl } = context as AppLoadContext

  if (!projectId || !workloadId) {
    throw new CustomError('Project ID and workload ID are required', 400)
  }

  // TODO: Need Best Way to retrieve workload data from parent layout route
  // Current implementation requires duplicate workload fetch since routes use workloadId parameter instead of uid
  const workload = await workloadsControl.detail(projectId, workloadId)

  if (!workload) {
    throw new CustomError('Workload not found', 404)
  }

  const instances = await instancesControl.list(projectId, workload.uid)
  return instances
}, authMiddleware)

export default function InstancesPage() {
  // revalidate every 10 seconds to keep deployment list fresh
  useRevalidateOnInterval({ enabled: true, interval: 10000 })

  const data = useLoaderData<typeof loader>()

  const columns: ColumnDef<IInstanceControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return (
            <span className="font-semibold leading-none text-primary">
              {row.original.name}
            </span>
          )
        },
      },
      {
        header: 'Type',
        accessorKey: 'type',
      },
      {
        header: 'External IP',
        accessorKey: 'externalIp',
        cell: ({ row }) => {
          return row.original.externalIp ?? '-'
        },
      },
      {
        header: 'Network IP',
        accessorKey: 'networkIp',
        cell: ({ row }) => {
          return row.original.networkIp ?? '-'
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return (
            row.original.status && (
              <WorkloadStatus
                readyText="Available"
                currentStatus={transformControlPlaneStatus(row.original.status)}
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
    [],
  )

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      loadingText="Loading..."
      emptyText="No instances found."
    />
  )
}
