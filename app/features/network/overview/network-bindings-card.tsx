import { DateTime } from '@/components/date-time';
import { StatusBadge } from '@/components/status-badge/status-badge';
import { TextCopy } from '@/components/text-copy/text-copy';
import { DataTable } from '@/modules/datum-ui/components/data-table/data-table';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { INetworkBindingControlResponse } from '@/resources/interfaces/network.interface';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getShortId } from '@/utils/helpers/text.helper';
import { Card, CardHeader, CardTitle, CardContent } from '@shadcn/ui/card';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const NetworkBindingsCard = ({ data }: { data: INetworkBindingControlResponse[] }) => {
  const columns: ColumnDef<INetworkBindingControlResponse>[] = useMemo(
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
        header: 'Status',
        accessorKey: 'status',
        enableSorting: false,
        cell: ({ row }) => {
          return (
            row.original.status && (() => {
              const transformedStatus = transformControlPlaneStatus(row.original.status);
              return (
                <StatusBadge
                  status={transformedStatus}
                  label={transformedStatus.status === ControlPlaneStatus.Success ? 'Active' : undefined}
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
          <CardTitle className="text-base leading-none font-medium">Network Bindings</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No network bindings found.', size: 'sm' }}
        />
      </CardContent>
    </Card>
  );
};
