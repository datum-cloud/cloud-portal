import { groupUsageSummaryRows } from '../usage-summary-grouping';
import { formatCurrency, formatUnitRate, formatUsagePair } from '../usage.format';
import type { UsageSummaryRow } from '../usage.types';
import { QuotaIndicator } from './quota-ring';
import { UsageSparkline } from './usage-sparkline';
import { type ColumnDef } from '@/components/table';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

interface UsageSummaryTableProps {
  rows: UsageSummaryRow[];
}

function ProductCell({ row }: { row: UsageSummaryRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <QuotaIndicator used={row.used} limit={row.limit} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <Tooltip message={row.label}>
          <span className="block truncate text-sm">{row.label}</span>
        </Tooltip>
      </div>
    </div>
  );
}

function RateCell({ row }: { row: UsageSummaryRow }) {
  const rate = formatUnitRate(row.unitRate, row.unit, row.currencyCode, row.pricingUnit);
  return (
    <Tooltip message={rate}>
      <span className="text-muted-foreground block truncate text-right text-sm tabular-nums">
        {rate}
      </span>
    </Tooltip>
  );
}

export function UsageSummaryTable({ rows }: UsageSummaryTableProps) {
  const grouped = useMemo(() => groupUsageSummaryRows(rows), [rows]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggleGroup = (group: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <Card className="shadow-none">
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          No meters defined yet for this organization.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardContent className="p-0">
        <div className="usage-summary-grouped-table min-w-0 overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col style={{ width: 300 }} />
              <col style={{ width: 144 }} />
              <col style={{ width: 108 }} />
              <col style={{ width: 188 }} />
              <col style={{ width: 112 }} />
            </colgroup>
            <thead>
              <tr className="border-border bg-background border-b">
                <th className="text-foreground border-border h-10 border-r px-4 text-left text-xs font-medium sm:px-5">
                  Product
                </th>
                <th className="text-foreground border-border h-10 border-r px-2 text-left text-xs font-medium">
                  Trend
                </th>
                <th className="text-foreground border-border h-10 border-r px-2 text-right text-xs font-medium">
                  Usage
                </th>
                <th className="text-foreground border-border h-10 border-r px-2 text-right text-xs font-medium">
                  Rate
                </th>
                <th className="text-foreground h-10 px-4 text-right text-xs font-medium sm:px-5">
                  Spend
                </th>
              </tr>
            </thead>
            {grouped.map((group, groupIndex) => {
              const isOpen = !collapsed.has(group.group);
              const isLastGroup = groupIndex === grouped.length - 1;

              return (
                <tbody key={group.group}>
                  <tr>
                    <th
                      colSpan={5}
                      className={cn(
                        'bg-muted/40 text-foreground h-10 p-0 text-left text-xs font-medium',
                        groupIndex > 0 && 'border-border border-t',
                        !isOpen && isLastGroup && 'border-border border-b'
                      )}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleGroup(group.group)}
                        className="flex h-10 w-full items-center gap-2 px-4 text-left sm:px-5">
                        <Icon
                          icon={ChevronRight}
                          aria-hidden
                          className={cn(
                            'size-4 shrink-0 transition-transform',
                            isOpen && 'rotate-90'
                          )}
                        />
                        <span>{group.group}</span>
                        <Badge
                          type="secondary"
                          className="text-2xs ml-auto flex cursor-default items-center gap-1.5 px-1 py-0.5 font-bold">
                          {group.items.length}
                        </Badge>
                      </button>
                    </th>
                  </tr>
                  {isOpen
                    ? group.items.map((row, rowIndex) => {
                        const isLastRow = isLastGroup && rowIndex === group.items.length - 1;
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              'border-border bg-table-cell',
                              !isLastRow && 'border-b',
                              rowIndex === 0 && 'border-t'
                            )}>
                            <td className="min-w-0 overflow-hidden px-4 py-2 sm:px-5">
                              <ProductCell row={row} />
                            </td>
                            <td className="min-w-0 overflow-hidden px-2 py-2">
                              <UsageSparkline
                                apiName={row.id}
                                unit={row.unit}
                                series={row.series}
                              />
                            </td>
                            <td className="min-w-0 overflow-hidden px-2 py-2">
                              <span className="text-muted-foreground block truncate text-right text-sm tabular-nums">
                                {formatUsagePair(row.unit, row.used, row.limit)}
                              </span>
                            </td>
                            <td className="min-w-0 overflow-hidden px-2 py-2">
                              <RateCell row={row} />
                            </td>
                            <td className="min-w-0 overflow-hidden px-4 py-2 sm:px-5">
                              <span className="text-foreground block truncate text-right text-sm font-medium tabular-nums">
                                {formatCurrency(row.spend, row.currencyCode)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>
              );
            })}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Skeleton props shared with the loading dashboard state. */
export const usageSummaryTableColumns: ColumnDef<UsageSummaryRow, unknown>[] = [
  { id: 'product', header: 'Product', size: 300 },
  { id: 'trend', header: 'Trend', size: 144 },
  { id: 'usage', header: 'Usage', size: 108 },
  { id: 'rate', header: 'Rate', size: 188 },
  { id: 'spend', header: 'Spend', size: 112 },
];
