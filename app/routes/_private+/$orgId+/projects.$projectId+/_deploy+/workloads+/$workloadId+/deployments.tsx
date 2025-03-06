import { DataTable } from '@/components/data-table/data-table'
import { DateFormat } from '@/components/date-format/date-format'
import { WorkloadStatus } from '@/features/workload/status'
import { useRevalidateOnInterval } from '@/hooks/useRevalidatorInterval'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { IWorkloadDeploymentControlResponse } from '@/resources/interfaces/workload.interface'
import { CustomError } from '@/utils/errorHandle'
import { transformControlPlaneStatus } from '@/utils/misc'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { LoaderFunctionArgs, AppLoadContext, useLoaderData } from 'react-router'

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, workloadId } = params

  const { workloadsControl, workloadDeploymentsControl } = context as AppLoadContext

  if (!projectId || !workloadId) {
    throw new CustomError('Project ID and workload ID are required', 400)
  }

  // TODO: Need Best Way to retrieve workload data from parent layout route
  // Current implementation requires duplicate workload fetch since routes use workloadId parameter instead of uid
  const workload = await workloadsControl.detail(projectId, workloadId)

  if (!workload) {
    throw new CustomError('Workload not found', 404)
  }

  const deployments = await workloadDeploymentsControl.list(projectId, workload.uid)
  return deployments
}, authMiddleware)

export default function WorkloadDeploymentsPage() {
  // revalidate every 10 seconds to keep deployment list fresh
  useRevalidateOnInterval({ enabled: true, interval: 10000 })

  const data = useLoaderData<typeof loader>()

  const columns: ColumnDef<IWorkloadDeploymentControlResponse>[] = useMemo(
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
        header: 'City Code',
        accessorKey: 'cityCode',
        cell: ({ row }) => {
          return (
            <span className="block w-[65px] text-center">{row.original.cityCode}</span>
          )
        },
      },
      {
        header: 'Location',
        accessorKey: 'location',
        cell: ({ row }) => {
          return row.original.location?.name
        },
      },
      {
        header: 'Replicas',
        accessorKey: 'replicas',
        enableSorting: false,
        cell: ({ row }) => {
          return `${row.original.currentReplicas} / ${row.original.desiredReplicas}`
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return (
            row.original.status && (
              <WorkloadStatus
                currentStatus={transformControlPlaneStatus(row.original.status)}
                type="badge"
                readyText="Available"
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
      emptyText="No workloads deployments found."
    />
  )
}
