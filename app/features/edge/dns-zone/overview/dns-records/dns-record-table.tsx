import type { DnsRecordTableProps } from './types';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableRef } from '@/modules/datum-ui/components/data-table';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { formatTTL } from '@/utils/helpers/dns-record.helper';
import { Badge, Tooltip } from '@datum-ui/components';
import { ColumnDef } from '@tanstack/react-table';
import { TriangleAlertIcon } from 'lucide-react';
import { forwardRef, useMemo } from 'react';

/**
 * Unified DNS record table component
 * - mode="compact": Simple table without pagination/toolbar/actions (for overview pages)
 * - mode="full": Full DataTable with pagination, search, filters, actions (for standalone pages)
 *
 * Displays flattened DNS records with columns: Type, Name, Value, TTL
 * Each value in DNS records becomes a separate row
 */
export const DnsRecordTable = forwardRef<DataTableRef<IFlattenedDnsRecord>, DnsRecordTableProps>(
  ({ data, mode = 'compact', className, emptyContent, tableContainerClassName, ...props }, ref) => {
    const columns: ColumnDef<IFlattenedDnsRecord>[] = useMemo(
      () => [
        {
          header: 'Type',
          accessorKey: 'type',
          size: 80,
          cell: ({ row }) => {
            return (
              <div className="flex items-center gap-2">
                <Badge type="quaternary" theme="outline">
                  {row.original.type}
                </Badge>

                {row.original.status && row.original.status === ControlPlaneStatus.Pending && (
                  <Tooltip
                    message={row.original.statusMessage}
                    contentClassName="max-w-64 bg-card text-destructive border"
                    arrowClassName="fill-card drop-shadow-[0_1px_0_var(--border)]">
                    <Badge
                      type="danger"
                      theme="solid"
                      className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-0.5">
                      <TriangleAlertIcon className="size-3" />
                      <span className="text-xs font-semibold">Error</span>
                    </Badge>
                  </Tooltip>
                )}
              </div>
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
          meta: {
            className: 'max-w-96 break-all text-wrap whitespace-normal',
          },
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

            // SOA records: parse JSON and format for display
            if (type === 'SOA') {
              try {
                const soa = JSON.parse(value);
                return (
                  <span className="text-sm break-all">
                    {soa.mname} {soa.rname} {soa.refresh || 0} {soa.retry || 0} {soa.expire || 0}{' '}
                    {soa.ttl || 0}
                  </span>
                );
              } catch {
                // Fallback if JSON parsing fails
                return <span className="text-sm break-all">{value}</span>;
              }
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
          tableContainerClassName={tableContainerClassName}
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
