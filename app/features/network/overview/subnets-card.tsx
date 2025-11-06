import { DateTime } from '@/components/date-time';
import { TextCopy } from '@/components/text-copy/text-copy';
import { DataTable } from '@/modules/datum-ui/components/data-table/data-table';
import { ISubnetControlResponse } from '@/resources/interfaces/network.interface';
import { getShortId } from '@/utils/helpers/text.helper';
import { Card, CardHeader, CardTitle, CardContent } from '@shadcn/ui/card';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const SubnetsCard = ({ data }: { data: ISubnetControlResponse[] }) => {
  const columns: ColumnDef<ISubnetControlResponse>[] = useMemo(
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
            row.original.uid && (
              <TextCopy
                className="text-sm"
                value={row.original.uid ?? ''}
                text={getShortId(row.original.uid ?? '')}
              />
            )
          );
        },
      },
      {
        header: 'Network Context',
        accessorKey: 'networkContext',
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.spec?.networkContext?.name;
        },
      },
      // --- START: NEW COMBINED COLUMN ---
      // This single column replaces 'IP Family', 'Prefix Length', and 'Start Address'.
      {
        header: 'CIDR',
        id: 'cidr-info',
        enableSorting: false,
        cell: ({ row }) => {
          const { spec } = row.original;
          // Gracefully handle cases where data might be missing
          if (!spec?.startAddress || spec.prefixLength === undefined) {
            return;
          }
          // Combine address and prefix length into standard CIDR notation
          const cidr = `${spec.startAddress}/${spec.prefixLength}`;

          return (
            <div className="flex flex-col">
              {/* The primary combined value, using a monospaced font for IP addresses */}
              <span className="font-mono text-sm">{cidr}</span>
              {/* The IP Family provides useful secondary context below the CIDR */}
              {spec.ipFamily && (
                <span className="text-muted-foreground text-xs">{spec.ipFamily}</span>
              )}
            </div>
          );
        },
      },
      // --- END: NEW COMBINED COLUMN ---
      // --- The original 'IP Family', 'Prefix Length', and 'Start Address' columns are now removed. ---
      {
        header: 'Subnet Class',
        accessorKey: 'subnetClass',
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.spec?.subnetClass;
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
          <CardTitle className="text-base leading-none font-medium">Subnets</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No subnets found.', size: 'sm' }}
        />
      </CardContent>
    </Card>
  );
};
