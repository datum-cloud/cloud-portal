import { groupUsageSummaryRows } from '../usage-summary-grouping';
import { formatUsagePair } from '../usage.format';
import type { UsageSummaryRow } from '../usage.types';
import { QuotaIndicator } from './quota-ring';
import { UsageSparkline } from './usage-sparkline';
import { sortableHeader } from '@/components/table';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { GroupedTable } from '@datum-cloud/datum-ui/grouped-table';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { ChevronDownIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface UsageSummaryTableProps {
  rows: UsageSummaryRow[];
  /** Rows shown before the "Show all" expander kicks in. */
  collapsedCount?: number;
}

export function UsageSummaryTable({ rows, collapsedCount = 5 }: UsageSummaryTableProps) {
  const [listExpanded, setListExpanded] = useState(false);

  const grouped = useMemo(() => groupUsageSummaryRows(rows), [rows]);

  const visibleGroups = useMemo(() => {
    if (listExpanded) return grouped;

    let remaining = collapsedCount;
    const result = [];
    for (const group of grouped) {
      if (remaining <= 0) break;
      const items = group.items.slice(0, remaining);
      if (items.length > 0) {
        result.push({ ...group, items });
        remaining -= items.length;
      }
    }
    return result;
  }, [grouped, listExpanded, collapsedCount]);

  const columns = useMemo<ColumnDef<UsageSummaryRow, unknown>[]>(
    () => [
      {
        id: 'product',
        header: sortableHeader<UsageSummaryRow>('Product'),
        accessorFn: (row) => row.label,
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <QuotaIndicator used={row.original.used} limit={row.original.limit} />
            <div className="min-w-0 flex-1 overflow-hidden">
              <Tooltip message={row.original.label}>
                <span className="block truncate text-sm">{row.original.label}</span>
              </Tooltip>
            </div>
          </div>
        ),
      },
      {
        id: 'trend',
        header: 'Trend',
        enableSorting: false,
        size: 192,
        cell: ({ row }) => (
          <UsageSparkline
            apiName={row.original.apiName}
            unit={row.original.unit}
            series={row.original.series}
          />
        ),
      },
      {
        id: 'usage',
        header: 'Usage',
        enableSorting: false,
        size: 144,
        cell: ({ row }) => (
          <span className="text-muted-foreground block text-right text-sm whitespace-nowrap tabular-nums">
            {formatUsagePair(row.original.unit, row.original.used, row.original.limit)}
          </span>
        ),
      },
    ],
    []
  );

  const groupedTableGroups = useMemo(
    () =>
      visibleGroups.map((group) => ({
        id: group.group,
        title: group.group,
        meta: (
          <Badge
            type="secondary"
            className="text-2xs flex cursor-default items-center gap-1.5 px-1 py-0.5 font-bold">
            {group.items.length}
          </Badge>
        ),
        rows: group.items,
      })),
    [visibleGroups]
  );

  const visibleGroupIds = useMemo(() => visibleGroups.map((group) => group.group), [visibleGroups]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(visibleGroupIds);

  useEffect(() => {
    setExpandedGroups(visibleGroupIds);
  }, [visibleGroupIds]);

  if (rows.length === 0) {
    return (
      <Card className="shadow-none">
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          No meters defined yet for this organization.
        </CardContent>
      </Card>
    );
  }

  const canExpand = rows.length > collapsedCount;
  const lastGroupId = visibleGroups[visibleGroups.length - 1]?.group;

  return (
    <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardContent className="p-0">
        <GroupedTable<UsageSummaryRow>
          columns={columns}
          groups={groupedTableGroups}
          enableSorting
          expanded={expandedGroups}
          onExpandedChange={setExpandedGroups}
          getRowId={(row) => row.apiName}
          className="[&>div:last-child]:rounded-none [&>div:last-child]:border-0"
          tableClassName="[&_th:not(:last-child)]:border-r [&_th]:border-border [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:first-child]:pl-4 [&_th:last-child]:pr-4 sm:[&_td:first-child]:pl-5 sm:[&_td:last-child]:pr-5 sm:[&_th:first-child]:pl-5 sm:[&_th:last-child]:pr-5"
          headerRowClassName="bg-background hover:bg-background border-b border-border"
          headerCellClassName="text-foreground text-xs font-medium"
          bodyClassName="[&_tr:last-child]:border-b [&_tr]:border-border"
          groupHeaderClassName={(group) => {
            const isOpen = expandedGroups.includes(group.id);
            const isLastGroup = group.id === lastGroupId;
            return cn(
              'bg-muted/40 text-foreground h-10 border-r-0 border-border px-4 text-xs font-medium sm:px-5',
              'border-t',
              isOpen || isLastGroup ? 'border-b' : 'border-b-0'
            );
          }}
        />
      </CardContent>
      {canExpand && (
        <CardFooter className="bg-background flex items-center justify-center border-t p-0">
          <Button
            htmlType="button"
            type="quaternary"
            theme="borderless"
            size="small"
            onClick={() => setListExpanded((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground w-full gap-1.5 rounded-none py-3 text-xs">
            {listExpanded ? 'Show less' : 'Show all'}
            <Icon
              icon={ChevronDownIcon}
              className={cn('size-3.5 transition-transform', listExpanded && 'rotate-180')}
            />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

/** Skeleton props shared with the loading dashboard state. */
export const usageSummaryTableColumns: ColumnDef<UsageSummaryRow, unknown>[] = [
  { id: 'product', header: 'Product', size: 256 },
  { id: 'trend', header: 'Trend', size: 192 },
  { id: 'usage', header: 'Usage', size: 144 },
];
