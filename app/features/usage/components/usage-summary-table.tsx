import { groupUsageSummaryRows } from '../usage-summary-grouping';
import { formatUsagePair } from '../usage.format';
import type { UsageSummaryRow } from '../usage.types';
import { QuotaIndicator } from './quota-ring';
import { SpendValue } from './spend-value';
import { UsageSparkline } from './usage-sparkline';
import { type ColumnDef, sortableHeader } from '@/components/table';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { GroupedTable } from '@datum-cloud/datum-ui/grouped-table';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { useMemo } from 'react';

interface UsageSummaryTableProps {
  rows: UsageSummaryRow[];
}

export function UsageSummaryTable({ rows }: UsageSummaryTableProps) {
  const grouped = useMemo(() => groupUsageSummaryRows(rows), [rows]);

  const columns = useMemo<ColumnDef<UsageSummaryRow, unknown>[]>(
    () => [
      {
        id: 'product',
        header: sortableHeader<UsageSummaryRow>('Product'),
        accessorFn: (row) => row.label,
        size: 300,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <QuotaIndicator used={row.original.used} limit={row.original.limit} />
            <div className="min-w-0 flex-1 overflow-hidden">
              <Tooltip message={row.original.label}>
                <Text ellipsis className="block">
                  {row.original.label}
                </Text>
              </Tooltip>
            </div>
          </div>
        ),
      },
      {
        id: 'trend',
        header: 'Trend',
        enableSorting: false,
        size: 144,
        cell: ({ row }) => (
          <UsageSparkline
            apiName={row.original.id}
            unit={row.original.unit}
            series={row.original.series}
          />
        ),
      },
      {
        id: 'usage',
        header: sortableHeader<UsageSummaryRow>('Usage'),
        accessorFn: (row) => row.used,
        size: 140,
        cell: ({ row }) => (
          <Text textColor="muted" ellipsis className="block text-right tabular-nums">
            {formatUsagePair(row.original.unit, row.original.used, row.original.limit)}
            {row.original.qualifier ? (
              <Text as="span" size="xs" textColor="muted" className="ml-1">
                {row.original.qualifier}
              </Text>
            ) : null}
          </Text>
        ),
      },
      {
        id: 'spend',
        header: sortableHeader<UsageSummaryRow>('Spend'),
        accessorFn: (row) => row.spend?.amount ?? -1,
        size: 112,
        cell: ({ row }) => (
          <Text ellipsis className="block text-right">
            <SpendValue
              spend={row.original.spend}
              unavailable={row.original.spendUnavailable}
              className="font-medium"
            />
          </Text>
        ),
      },
    ],
    []
  );

  const groups = useMemo(
    () =>
      grouped.map((group) => ({
        id: group.group,
        title: group.group,
        meta: (
          <Badge
            type="secondary"
            className="text-5xs flex cursor-default items-center gap-1.5 px-1 py-0.5 font-bold">
            {group.items.length}
          </Badge>
        ),
        rows: group.items,
      })),
    [grouped]
  );

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          No meters defined yet for this organization.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm" sectioned className="min-w-0 overflow-hidden">
      <CardContent padding="none">
        <GroupedTable<UsageSummaryRow>
          columns={columns}
          groups={groups}
          defaultExpanded="all"
          enableSorting
          getRowId={(row) => row.id}
          className="usage-summary-grouped-table min-w-0 [&>div:last-child]:rounded-none [&>div:last-child]:border-0"
          tableClassName="[&_th:not(:last-child)]:border-r [&_th]:border-border [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 sm:[&_td:first-child]:pl-5 sm:[&_td:last-child]:pr-5 sm:[&_th:first-child]:pl-5 sm:[&_th:last-child]:pr-5"
          headerRowClassName="bg-background hover:bg-background border-b border-border"
          headerCellClassName="text-foreground h-10 text-xs font-medium"
          groupHeaderClassName="bg-muted/40 text-foreground h-10 px-4 text-xs font-medium sm:px-5"
        />
      </CardContent>
    </Card>
  );
}

/** Skeleton props shared with the loading dashboard state. */
export const usageSummaryTableColumns: ColumnDef<UsageSummaryRow, unknown>[] = [
  { id: 'product', header: 'Product', size: 300 },
  { id: 'trend', header: 'Trend', size: 144 },
  { id: 'usage', header: 'Usage', size: 140 },
  { id: 'spend', header: 'Spend', size: 112 },
];
