import { EmptyContentProps } from '@/components/empty-content/empty-content';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableProps, DataTableRef } from '@/modules/datum-ui/components/data-table';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { formatTTL } from '@/utils/helpers/dns-record.helper';
import { Badge, Tooltip } from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';
import { forwardRef, useMemo } from 'react';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Base props shared by both compact and full modes
 */
interface DnsRecordTableBaseProps {
  data: IFlattenedDnsRecord[];
  className?: string;
  emptyContent?: EmptyContentProps;
}

/**
 * Compact mode props
 * Simple table without actions, pagination, or toolbar (for overview pages)
 */
interface DnsRecordTableCompactProps extends DnsRecordTableBaseProps {
  mode: 'compact';
}

/**
 * Full mode props
 * Inherits ALL DataTable props for complete functionality (for standalone pages)
 */
interface DnsRecordTableFullProps
  extends DnsRecordTableBaseProps,
    Omit<
      DataTableProps<IFlattenedDnsRecord, any>,
      'data' | 'columns' | 'className' | 'emptyContent' | 'mode'
    > {
  mode: 'full';
}

/**
 * Discriminated union: mode determines available props
 */
export type DnsRecordTableProps = DnsRecordTableCompactProps | DnsRecordTableFullProps;

/**
 * Unified DNS record table component
 * - mode="compact": Simple table without pagination/toolbar/actions (for overview pages)
 * - mode="full": Full DataTable with pagination, search, filters, actions (for standalone pages)
 *
 * Displays flattened DNS records with columns: Type, Name, Value, TTL
 * Each value in DNS records becomes a separate row
 */
export const DnsRecordTable = forwardRef<DataTableRef<IFlattenedDnsRecord>, DnsRecordTableProps>(
  ({ data, mode = 'compact', className, emptyContent, ...props }, ref) => {
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
            const { type, value } = row.original;

            // MX records: decode "preference|exchange" format
            if (type === 'MX' && value.includes('|')) {
              const [preference, exchange] = value.split('|');
              return (
                <div className="flex items-center gap-2">
                  <span className="text-sm break-all">{exchange}</span>
                  <Tooltip
                    side="bottom"
                    message="Priority of mail servers defined by MX records. Lowest value = highest priority."
                    contentClassName="max-w-64">
                    <Badge
                      type="success"
                      theme="light"
                      className="max-w- cursor-pointer px-1 py-0.5 text-xs">
                      {preference}
                    </Badge>
                  </Tooltip>
                </div>
              );
            }

            return <span className="text-sm break-all">{value}</span>;
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

    // Compact mode: Simple table without actions/pagination/toolbar
    if (mode === 'compact') {
      return (
        <DataTable
          ref={ref}
          className={className}
          hidePagination
          columns={columns}
          data={data}
          emptyContent={emptyContent || { title: 'No DNS records found' }}
        />
      );
    }

    // Full mode: Spread all DataTable props
    return (
      <DataTable
        ref={ref}
        className={className}
        columns={columns}
        data={data}
        emptyContent={emptyContent || { title: 'No DNS records found' }}
        {...props} // All DataTable props automatically passed through
      />
    );
  }
);

DnsRecordTable.displayName = 'DnsRecordTable';
