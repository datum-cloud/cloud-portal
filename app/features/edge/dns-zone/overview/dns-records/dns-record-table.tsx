import { EmptyContentProps } from '@/components/empty-content/empty-content';
import { DataTable } from '@/modules/datum-ui/components/data-table/data-table';
import {
  DataTableRowActionsProps,
  DataTableTitleProps,
  DataTableToolbarConfig,
} from '@/modules/datum-ui/components/data-table/data-table.types';
import { IDnsRecordSetControlResponse } from '@/resources/interfaces/dns.interface';
import { Badge } from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

export interface DnsRecordTableProps {
  data: IDnsRecordSetControlResponse[];
  mode?: 'compact' | 'full';
  pageSize?: number;
  onRowClick?: (row: IDnsRecordSetControlResponse) => void;
  rowActions?: DataTableRowActionsProps<IDnsRecordSetControlResponse>[];
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
 */
export const DnsRecordTable = ({
  data,
  mode = 'full',
  pageSize = 50,
  onRowClick,
  rowActions,
  tableTitle,
  toolbar,
  filters,
  emptyContent,
  className,
}: DnsRecordTableProps) => {
  const isCompact = mode === 'compact';

  const columns: ColumnDef<IDnsRecordSetControlResponse>[] = useMemo(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.name}</span>;
        },
        meta: {
          sortPath: 'name',
          sortType: 'text',
        },
      },
      {
        header: 'Type',
        accessorKey: 'recordType',
        cell: ({ row }) => {
          return (
            <Badge type="quaternary" theme="outline">
              {row.original.recordType}
            </Badge>
          );
        },
        meta: {
          sortPath: 'recordType',
          sortType: 'text',
        },
      },
      {
        header: 'Records',
        accessorKey: 'records',
        enableSorting: false,
        cell: ({ row }) => {
          const records = row.original.records;
          if (!records) return '-';

          // Handle different record types
          const recordsText = typeof records === 'string' ? records : JSON.stringify(records);

          // For compact mode, show truncated text
          if (isCompact) {
            const displayText =
              recordsText.length > 50 ? `${recordsText.substring(0, 50)}...` : recordsText;
            return <span className="text-sm">{displayText}</span>;
          }

          // For full mode, show formatted JSON
          const formattedText =
            typeof records === 'string' ? records : JSON.stringify(records, null, 2);
          return (
            <pre className="max-w-md text-sm break-all whitespace-pre-wrap">{formattedText}</pre>
          );
        },
      },
      ...(isCompact
        ? []
        : [
            {
              header: 'DNS Zone',
              accessorKey: 'dnsZoneId',
              cell: ({ row }: { row: { original: IDnsRecordSetControlResponse } }) => {
                return <span className="text-sm">{row.original.dnsZoneId || '-'}</span>;
              },
              meta: {
                sortPath: 'dnsZoneId',
                sortType: 'text',
              },
            } as ColumnDef<IDnsRecordSetControlResponse>,
          ]),
    ],
    [isCompact]
  );

  return (
    <DataTable
      className={className || (isCompact ? undefined : 'max-w-(--breakpoint-2xl)')}
      hidePagination={isCompact}
      pageSize={isCompact ? undefined : pageSize}
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
