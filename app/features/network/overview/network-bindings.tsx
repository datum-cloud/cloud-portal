import { DataTable } from '@/components/data-table/data-table';
import { DateFormat } from '@/components/date-format/date-format';
import { StatusBadge } from '@/components/status-badge/status-badge';
import { TextCopy } from '@/components/text-copy/text-copy';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { INetworkBindingControlResponse } from '@/resources/interfaces/network.interface';
import { getShortId, transformControlPlaneStatus } from '@/utils/misc';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const NetworkBindingsTable = ({ data }: { data: INetworkBindingControlResponse[] }) => {
  const columns: ColumnDef<INetworkBindingControlResponse>[] = useMemo(
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
        header: 'UID',
        accessorKey: 'uid',
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <TextCopy
              className="text-sm"
              value={row.original.uid ?? ''}
              text={getShortId(row.original.uid ?? '')}
            />
          );
        },
      },
      {
        header: 'Location',
        accessorKey: 'location',
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.spec?.location?.name;
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        enableSorting: false,
        cell: ({ row }) => {
          return (
            row.original.status && (
              <StatusBadge
                status={transformControlPlaneStatus(row.original.status)}
                type="badge"
                readyText="Active"
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
        <CardTitle className="text-base leading-none font-medium">Network Bindings</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No network bindings found.', size: 'sm' }}
        />
      </CardContent>
    </Card>
  );
};
