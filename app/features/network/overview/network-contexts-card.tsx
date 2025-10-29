import { DataTable } from '@/components/data-table/data-table';
import { DateTime } from '@/components/date-time';
import { TextCopy } from '@/components/text-copy/text-copy';
import { INetworkContextControlResponse } from '@/resources/interfaces/network.interface';
import { getShortId } from '@/utils/helpers/text.helper';
import { Card, CardHeader, CardTitle, CardContent } from '@shadcn/ui/card';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const NetworkContextsCard = ({ data }: { data: INetworkContextControlResponse[] }) => {
  const columns: ColumnDef<INetworkContextControlResponse>[] = useMemo(
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
          <CardTitle className="text-base leading-none font-medium">Network Contexts</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No network contexts found.', size: 'sm' }}
        />
      </CardContent>
    </Card>
  );
};
