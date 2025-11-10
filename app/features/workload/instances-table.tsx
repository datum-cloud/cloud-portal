import { WorkloadStatus } from './status';
import { DateTime } from '@/components/date-time';
import { TextCopy } from '@/components/text-copy/text-copy';
import { DataTable } from '@/modules/datum-ui/components/data-table/data-table';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IInstanceControlResponse } from '@/resources/interfaces/workload.interface';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { CardContent, CardHeader, CardTitle, Card } from '@shadcn/ui/card';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const InstancesTable = ({ data }: { data: IInstanceControlResponse[] }) => {
  const columns: ColumnDef<IInstanceControlResponse>[] = useMemo(
    () => [
      {
        header: 'Resource Name',
        accessorKey: 'name',
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <TextCopy
              value={row.original.name ?? ''}
              className="text-primary leading-none font-semibold"
            />
          );
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
          return row.original.externalIp ? <TextCopy value={row.original.externalIp} /> : '-';
        },
      },
      {
        header: 'Network IP',
        accessorKey: 'networkIp',
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.networkIp ? <TextCopy value={row.original.networkIp} /> : '-';
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        enableSorting: false,
        cell: ({ row }) => {
          return (
            row.original.status &&
            (() => {
              const transformedStatus = transformControlPlaneStatus(row.original.status);
              return (
                <WorkloadStatus
                  label={
                    transformedStatus.status === ControlPlaneStatus.Success ? 'Available' : undefined
                  }
                  currentStatus={transformedStatus}
                />
              );
            })()
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.createdAt && <DateTime date={row.original.createdAt} />;
        },
      },
    ],
    []
  );

  return (
    <Card className="bg-card text-card-foreground w-full rounded-xl border shadow">
      {data.length > 0 && (
        <CardHeader className="px-6">
          <CardTitle className="text-base leading-none font-medium">Instances</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No instances found.', size: 'sm' }}
        />
      </CardContent>
    </Card>
  );
};
