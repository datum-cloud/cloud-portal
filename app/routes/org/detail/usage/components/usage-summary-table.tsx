import { groupUsageSummaryRows } from '../usage-summary-grouping';
import { formatUsagePair } from '../usage.format';
import type { UsageSummaryRow } from '../usage.types';
import { QuotaIndicator } from './quota-ring';
import { UsageSparkline } from './usage-sparkline';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@datum-cloud/datum-ui/table';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

const ROW_INSET =
  '[&_th:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:first-child]:pl-4 [&_td:last-child]:pr-4 sm:[&_th:first-child]:pl-5 sm:[&_th:last-child]:pr-5 sm:[&_td:first-child]:pl-5 sm:[&_td:last-child]:pr-5';

const HEADER_DIVIDERS = '[&_th:not(:last-child)]:border-r [&_th]:border-border';

/** Desktop caps product width when expanding the list; mobile uses a fixed split. */
const PRODUCT_COL_CLASS = 'max-w-0 w-[65%] overflow-hidden sm:w-[16rem] sm:max-w-[16rem]';
const TREND_COL_CLASS = 'hidden w-0 p-0 sm:table-cell sm:w-48 sm:p-2';
const USAGE_COL_CLASS = 'w-[35%] shrink-0 overflow-hidden text-right sm:w-36';

type SortDirection = 'asc' | 'desc';

interface UsageSummaryTableProps {
  rows: UsageSummaryRow[];
  /** Rows shown before the "Show all" expander kicks in. */
  collapsedCount?: number;
}

export function UsageSummaryTable({ rows, collapsedCount = 5 }: UsageSummaryTableProps) {
  const [listExpanded, setListExpanded] = useState(false);
  const [sort, setSort] = useState<SortDirection | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const multiplier = sort === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => a.label.localeCompare(b.label) * multiplier);
  }, [rows, sort]);

  const grouped = useMemo(() => groupUsageSummaryRows(sortedRows), [sortedRows]);

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

  const isGroupOpen = (group: string) => openGroups[group] ?? true;

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !(prev[group] ?? true) }));
  };

  const handleSort = () => {
    setSort((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'));
  };

  const SortIcon =
    sort === 'asc' ? ChevronUpIcon : sort === 'desc' ? ChevronDownIcon : ChevronsUpDownIcon;

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

  return (
    <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className={cn('w-full table-fixed', ROW_INSET, HEADER_DIVIDERS)}>
            <colgroup>
              <col className="w-[65%] sm:w-[16rem]" />
              <col className="hidden w-0 sm:table-column sm:w-48" />
              <col className="w-[35%] sm:w-36" />
            </colgroup>
            <TableHeader>
              <TableRow className="bg-background hover:bg-background">
                <TableHead className={cn('text-foreground text-xs font-medium', PRODUCT_COL_CLASS)}>
                  <button
                    type="button"
                    onClick={handleSort}
                    aria-sort={
                      sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'
                    }
                    className="hover:text-foreground/80 flex w-full items-center gap-1.5 text-left transition-colors">
                    <span>Product</span>
                    <Icon
                      icon={SortIcon}
                      className={cn('size-3.5', sort ? 'text-foreground' : 'text-muted-foreground')}
                    />
                  </button>
                </TableHead>
                <TableHead className={cn('text-foreground text-xs font-medium', TREND_COL_CLASS)}>
                  Trend
                </TableHead>
                <TableHead className={cn('text-foreground text-xs font-medium', USAGE_COL_CLASS)}>
                  Usage
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleGroups.map((group) => (
                <Fragment key={group.group}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={3} className="py-0 pr-4 pl-4 sm:pr-5 sm:pl-5">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.group)}
                        className="text-foreground flex h-10 w-full items-center gap-2 text-left text-xs font-medium">
                        <Icon
                          icon={ChevronRightIcon}
                          className={cn(
                            'text-muted-foreground size-4 shrink-0 transition-transform',
                            isGroupOpen(group.group) && 'rotate-90'
                          )}
                        />
                        <span>{group.group}</span>
                        <Badge
                          type="secondary"
                          className="text-2xs flex cursor-default items-center gap-1.5 px-1 py-0.5 font-bold">
                          {group.items.length}
                        </Badge>
                      </button>
                    </TableCell>
                  </TableRow>
                  {isGroupOpen(group.group)
                    ? group.items.map((row) => (
                        <TableRow key={row.apiName}>
                          <TableCell className={cn('text-sm', PRODUCT_COL_CLASS)}>
                            <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                              <QuotaIndicator used={row.used} limit={row.limit} />
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <Tooltip message={row.label}>
                                  <span className="block truncate">{row.label}</span>
                                </Tooltip>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={TREND_COL_CLASS}>
                            <UsageSparkline
                              apiName={row.apiName}
                              unit={row.unit}
                              series={row.series}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-muted-foreground text-sm whitespace-nowrap tabular-nums',
                              USAGE_COL_CLASS
                            )}>
                            {formatUsagePair(row.unit, row.used, row.limit)}
                          </TableCell>
                        </TableRow>
                      ))
                    : null}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
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
