import { DataTable } from '@/components/common/data-table/data-table';
import { DateFormat } from '@/components/common/date-format';
import { TextCopy } from '@/components/common/text-copy/text-copy';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ISubnetClaimControlResponse } from '@/resources/interfaces/network.interface';
import { getShortId } from '@/utils/misc';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export const SubnetClaimsCard = ({ data }: { data: ISubnetClaimControlResponse[] }) => {
  const columns: ColumnDef<ISubnetClaimControlResponse>[] = useMemo(
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
        header: 'Subnet Ref',
        accessorKey: 'subnetRef',
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.status?.subnetRef?.name;
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
          return row.original.createdAt && <DateFormat date={row.original.createdAt} />;
        },
      },
    ],
    []
  );

  return (
    <Card className="bg-card text-card-foreground w-full rounded-xl border shadow">
      {data.length > 0 && (
        <CardHeader className="px-6">
          <CardTitle className="text-base leading-none font-medium">Subnet Claims</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <DataTable
          columns={columns}
          data={data ?? []}
          emptyContent={{ title: 'No subnet claims found.', size: 'sm' }}
        />
      </CardContent>
    </Card>
  );
};
