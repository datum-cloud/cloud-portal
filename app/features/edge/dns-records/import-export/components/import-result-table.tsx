import { DataTable } from '@/modules/datum-ui/components/data-table';
import { formatTTL, type ImportDetail } from '@/utils/helpers/dns-record.helper';
import { Badge, Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, XCircle, AlertCircle, MinusCircle } from 'lucide-react';
import { useMemo } from 'react';

// =============================================================================
// Status Configuration
// =============================================================================

/**
 * Get icon and styling for import action status
 */
const getStatusConfig = (action: ImportDetail['action']) => {
  switch (action) {
    case 'created':
      return {
        icon: CheckCircle2,
        label: 'Created',
        className: 'text-green-600',
      };
    case 'updated':
      return {
        icon: AlertCircle,
        label: 'Updated',
        className: 'text-blue-600',
      };
    case 'skipped':
      return {
        icon: MinusCircle,
        label: 'Skipped',
        className: 'text-muted-foreground',
      };
    case 'failed':
      return {
        icon: XCircle,
        label: 'Failed',
        className: 'text-destructive',
      };
  }
};

// =============================================================================
// Component
// =============================================================================

interface ImportResultTableProps {
  details: ImportDetail[];
}

/**
 * Import result table showing individual record results
 * Uses same DataTable component as DnsRecordTable for consistent styling
 */
export const ImportResultTable = ({ details }: ImportResultTableProps) => {
  const columns: ColumnDef<ImportDetail>[] = useMemo(
    () => [
      {
        header: 'Type',
        accessorKey: 'recordType',
        size: 120,
        cell: ({ row }) => {
          return (
            <Badge type="quaternary" theme="outline">
              {row.original.recordType}
            </Badge>
          );
        },
      },
      {
        header: 'Name',
        accessorKey: 'name',
        size: 150,
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.name || '@'}</span>;
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
          const { recordType, value } = row.original;

          // MX records: decode "preference|exchange" format
          if (recordType === 'MX' && value.includes('|')) {
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
          if (recordType === 'SOA') {
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
      },
      {
        header: 'Status',
        accessorKey: 'action',
        size: 180,
        cell: ({ row }) => {
          const { action, message } = row.original;
          const statusConfig = getStatusConfig(action);
          const StatusIcon = statusConfig.icon;
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <StatusIcon className={cn('size-4', statusConfig.className)} />
                <span className={cn('text-xs font-medium', statusConfig.className)}>
                  {statusConfig.label}
                </span>
              </div>
              {message && <span className="text-muted-foreground pl-5.5 text-xs">{message}</span>}
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <DataTable
      className="rounded-xl"
      tableContainerClassName="rounded-xl max-h-[400px]"
      hidePagination
      columns={columns}
      data={details}
      emptyContent={{ title: 'No import results' }}
    />
  );
};
