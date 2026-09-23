import { type ColumnDef, Table } from '@/components/table';
import { formatTTL, type ImportDetail } from '@/utils/helpers/dns-record.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
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
                <Text className="break-all">{exchange}</Text>
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
                <Text className="break-all">
                  {soa.mname} {soa.rname} {soa.refresh || 0} {soa.retry || 0} {soa.expire || 0}{' '}
                  {soa.ttl || 0}
                </Text>
              );
            } catch {
              // Fallback if JSON parsing fails
              return <Text className="break-all">{value}</Text>;
            }
          }

          return <Text className="break-all">{value}</Text>;
        },
      },
      {
        header: 'TTL',
        accessorKey: 'ttl',
        size: 100,
        cell: ({ row }) => {
          return <Text>{formatTTL(row.original.ttl)}</Text>;
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
                <Icon icon={StatusIcon} className={cn('size-4', statusConfig.className)} />
                <Text size="xs" weight="medium" className={statusConfig.className}>
                  {statusConfig.label}
                </Text>
              </div>
              {/* Show message for failed and skipped records */}
              {message && action !== 'created' && (
                <Text size="xs" textColor="muted" className="pl-5.5 text-wrap">
                  {message}
                </Text>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <Table.Client
      columns={columns}
      data={details}
      pagination={false}
      urlSync={false}
      empty="No import results"
      className="max-h-[400px] rounded-xl"
    />
  );
};
