import { WorkloadStatus } from './status';
import { DataTable } from '@/components/data-table/data-table';
import { DateFormat } from '@/components/date-format/date-format';
import { TextCopy } from '@/components/text-copy/text-copy';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { IWorkloadDeploymentControlResponse } from '@/resources/interfaces/workload.interface';
import { transformControlPlaneStatus } from '@/utils/misc';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const DeploymentsTable = ({ data }: { data: IWorkloadDeploymentControlResponse[] }) => {
  const columns: ColumnDef<IWorkloadDeploymentControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
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
        header: 'City Code',
        accessorKey: 'cityCode',
        enableSorting: false,
        cell: ({ row }) => {
          return <span className="block w-[65px] text-center">{row.original.cityCode}</span>;
        },
      },
      {
        header: 'Location',
        accessorKey: 'location',
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.location?.name;
        },
      },
      {
        header: 'Replicas',
        accessorKey: 'replicas',
        enableSorting: false,
        cell: ({ row }) => {
          return `${row.original.currentReplicas} / ${row.original.desiredReplicas}`;
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
                currentStatus={transformControlPlaneStatus(row.original.status)}
                type="badge"
                readyText="Available"
                badgeClassName="px-0"
              />
            )
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />;
        },
      },
    ],
    []
  );

  return (
    <Card className="bg-card text-card-foreground w-full rounded-xl border shadow">
      <CardHeader className="px-6">
        <CardTitle className="text-base leading-none font-medium">Deployments</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No deployments found.' }}
        />
      </CardContent>
    </Card>
  );
};
