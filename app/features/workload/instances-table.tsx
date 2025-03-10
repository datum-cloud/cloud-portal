import { WorkloadStatus } from './status'
import { DataTable } from '@/components/data-table/data-table'
import { DateFormat } from '@/components/date-format/date-format'
import { TextCopy } from '@/components/text-copy/text-copy'
import { CardContent, CardHeader, CardTitle, Card } from '@/components/ui/card'
import { IInstanceControlResponse } from '@/resources/interfaces/workload.interface'
import { transformControlPlaneStatus } from '@/utils/misc'
import { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'

export const InstancesTable = ({ data }: { data: IInstanceControlResponse[] }) => {
  const columns: ColumnDef<IInstanceControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <TextCopy
              value={row.original.name ?? ''}
              className="font-semibold leading-none text-primary"
            />
          )
        },
      },
      {
        header: 'Type',
        accessorKey: 'type',
        enableSorting: false,
      },
      {
        header: 'External IP',
        accessorKey: 'externalIp',
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.externalIp ? (
            <TextCopy value={row.original.externalIp} />
          ) : (
            '-'
          )
        },
      },
      {
        header: 'Network IP',
        accessorKey: 'networkIp',
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.networkIp ? (
            <TextCopy value={row.original.networkIp} />
          ) : (
            '-'
          )
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        enableSorting: false,
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
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />
        },
      },
    ],
    [],
  )

  return (
    <Card className="w-full rounded-xl border bg-card text-card-foreground shadow">
      <CardHeader className="px-6 py-4">
        <CardTitle className="text-base font-medium leading-none">Instances</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={data ?? []}
          loadingText="Loading..."
          emptyText="No instances found."
        />
      </CardContent>
    </Card>
  )
}
