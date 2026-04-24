import { NameserverChips } from '@/components/nameserver-chips';
import { createActionsColumn, Table } from '@/components/table';
import type { ActionItem } from '@/components/table';
import { IDnsNameserver, IDnsRegistration } from '@/resources/domains';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

export interface NameserverTableProps {
  data: IDnsNameserver[];
  registration?: IDnsRegistration;
  title?: string;
  titleActions?: ReactNode;
  emptyMessage?: string;
  className?: string;
  rowActions?: ActionItem<IDnsNameserver>[];
}

export const NameserverTable = ({
  data,
  registration,
  title,
  titleActions,
  emptyMessage,
  className,
  rowActions,
}: NameserverTableProps) => {
  const columns: ColumnDef<IDnsNameserver>[] = useMemo(
    () => [
      {
        header: 'Type',
        accessorKey: 'type',
        enableSorting: false,
        cell: () => {
          return (
            <Badge type="quaternary" theme="outline">
              NS
            </Badge>
          );
        },
      },
      {
        header: 'Value',
        accessorKey: 'hostname',
        cell: ({ row }) => {
          return <span>{row.original.hostname}</span>;
        },
        meta: {
          sortPath: 'hostname',
          sortType: 'text',
        },
      },
      {
        id: 'nameservers',
        header: 'DNS Host',
        accessorKey: 'nameservers',
        cell: ({ row }) => {
          return <NameserverChips data={row.original.ips} maxVisible={2} />;
        },
        meta: {
          sortPath: 'status.nameservers',
          sortType: 'array',
          sortArrayBy: 'ips.registrantName',
        },
      },
      {
        id: 'registrar',
        header: 'Registrar',
        accessorKey: 'registrar',
        enableSorting: false,
        cell: () => {
          return (
            <Badge type="quaternary" theme="outline">
              {registration?.registrar?.name ?? '-'}
            </Badge>
          );
        },
      },
      ...(rowActions && rowActions.length > 0
        ? [createActionsColumn<IDnsNameserver>(rowActions)]
        : []),
    ],
    [registration, rowActions]
  );

  return (
    <Table.Client
      columns={columns}
      data={data}
      title={title}
      actions={titleActions ? [titleActions] : undefined}
      empty={emptyMessage ?? 'No nameservers found'}
      pagination={false}
      className={className}
    />
  );
};
