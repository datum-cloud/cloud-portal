import { DnsHostChips } from '@/components/dns-host-chips';
import { EmptyContentProps } from '@/components/empty-content/empty-content';
import { DataTable, DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import { DataTableTitleProps } from '@/modules/datum-ui/components/data-table';
import { IDnsNameserver, IDnsRegistration } from '@/resources/interfaces/dns.interface';
import { Badge } from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export interface NameserverTableProps {
  data: IDnsNameserver[];
  registration?: IDnsRegistration;
  tableTitle?: DataTableTitleProps;
  emptyContent?: EmptyContentProps;
  className?: string;
  rowActions?: DataTableRowActionsProps<IDnsNameserver>[];
}

export const NameserverTable = ({
  data,
  registration,
  tableTitle,
  emptyContent,
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
          return <DnsHostChips data={row.original.ips} maxVisible={2} />;
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
    ],
    [registration]
  );

  return (
    <DataTable
      className={className}
      hidePagination
      columns={columns}
      data={data}
      tableTitle={tableTitle}
      emptyContent={
        emptyContent || {
          title: 'No nameservers found',
        }
      }
      rowActions={rowActions}
    />
  );
};
