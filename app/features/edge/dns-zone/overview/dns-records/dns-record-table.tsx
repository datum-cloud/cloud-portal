import { EmptyContentProps } from '@/components/empty-content/empty-content';
import { DataTable } from '@/modules/datum-ui/components/data-table/data-table';
import {
  DataTableRowActionsProps,
  DataTableTitleProps,
  DataTableToolbarConfig,
} from '@/modules/datum-ui/components/data-table/data-table.types';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { formatTTL } from '@/utils/helpers/dns-record.helper';
import { Badge } from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export interface DnsRecordTableProps {
  data: IFlattenedDnsRecord[];
  hidePagination?: boolean;
  onRowClick?: (row: IFlattenedDnsRecord) => void;
  rowActions?: DataTableRowActionsProps<IFlattenedDnsRecord>[];
  tableTitle?: DataTableTitleProps;
  toolbar?: DataTableToolbarConfig;
  filters?: React.ReactNode;
  emptyContent?: EmptyContentProps;
  className?: string;
}

/**
 * Unified DNS record table component
 * - mode="compact": Simple table without pagination/toolbar (for overview pages)
 * - mode="full": Full DataTable with pagination, search, filters (for standalone pages)
 *
 * Displays flattened DNS records with columns: Type, Name, Value, TTL, Status
 * Each value in DNS records becomes a separate row
 */
export const DnsRecordTable = ({
  data,
  hidePagination = false,
  onRowClick,
  rowActions,
  tableTitle,
  toolbar,
  filters,
  emptyContent,
  className,
}: DnsRecordTableProps) => {
  const columns: ColumnDef<IFlattenedDnsRecord>[] = useMemo(
    () => [
      {
        header: 'Type',
        accessorKey: 'type',
        size: 80,
        cell: ({ row }) => {
          return (
            <Badge type="quaternary" theme="outline">
              {row.original.type}
            </Badge>
          );
        },
        meta: {
          sortPath: 'type',
          sortType: 'text',
        },
      },
      {
        header: 'Name',
        accessorKey: 'name',
        size: 150,
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.name}</span>;
        },
        meta: {
          sortPath: 'name',
          sortType: 'text',
        },
      },
      {
        header: 'Content',
        accessorKey: 'value',
        enableSorting: false,
        cell: ({ row }) => {
          return <span className="text-sm break-all">{row.original.value}</span>;
        },
      },
      {
        header: 'TTL',
        accessorKey: 'ttl',
        size: 100,
        cell: ({ row }) => {
          return <span className="text-sm">{formatTTL(row.original.ttl)}</span>;
        },
        meta: {
          sortPath: 'ttl',
          sortType: 'number',
        },
      },
    ],
    []
  );

  return (
    <DataTable
      className={className}
      hidePagination={hidePagination}
      columns={columns}
      data={data}
      onRowClick={onRowClick}
      rowActions={rowActions}
      tableTitle={tableTitle}
      toolbar={toolbar}
      filters={filters}
      emptyContent={
        emptyContent || {
          title: 'No DNS records found',
        }
      }
    />
  );
};
