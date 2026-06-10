import { formatUsagePair } from '../usage.format';
import type { UsageSummaryRow } from '../usage.types';
import { QuotaRing } from './quota-ring';
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
import { cn } from '@datum-cloud/datum-ui/utils';
import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

// Align the first/last cells with the card padding (mirrors past-invoices-card).
const ROW_INSET =
  '[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5';

// Vertical dividers between header cells (mirrors past-invoices-card).
const HEADER_DIVIDERS = '[&_th:not(:last-child)]:border-r [&_th]:border-border';

type SortDirection = 'asc' | 'desc';

interface UsageSummaryTableProps {
  rows: UsageSummaryRow[];
  /** Rows shown before the "Show all" expander kicks in. */
  collapsedCount?: number;
}

export function UsageSummaryTable({ rows, collapsedCount = 5 }: UsageSummaryTableProps) {
  const [expanded, setExpanded] = useState(false);
  // Sorting on the Service column only. `null` keeps the declared order.
  const [sort, setSort] = useState<SortDirection | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const multiplier = sort === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => a.label.localeCompare(b.label) * multiplier);
  }, [rows, sort]);

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
  const visibleRows = expanded || !canExpand ? sortedRows : sortedRows.slice(0, collapsedCount);

  return (
    <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardContent className="p-0">
        <Table className={cn(ROW_INSET, HEADER_DIVIDERS)}>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="text-foreground text-xs font-medium">
                <button
                  type="button"
                  onClick={handleSort}
                  aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'}
                  className="hover:text-foreground/80 flex w-full items-center gap-1.5 text-left transition-colors">
                  <span>Service</span>
                  <Icon
                    icon={SortIcon}
                    className={cn('size-3.5', sort ? 'text-foreground' : 'text-muted-foreground')}
                  />
                </button>
              </TableHead>
              <TableHead className="text-foreground text-xs font-medium">Usage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.apiName}>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-2.5">
                    <QuotaRing used={row.used} limit={row.limit} />
                    <span>{row.label}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap tabular-nums">
                  {formatUsagePair(row.unit, row.used, row.limit)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {canExpand && (
        <CardFooter className="bg-background flex items-center justify-center border-t p-0">
          <Button
            htmlType="button"
            type="quaternary"
            theme="borderless"
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground w-full gap-1.5 rounded-none py-3 text-xs">
            {expanded ? 'Show less' : 'Show all'}
            <Icon
              icon={ChevronDownIcon}
              className={cn('size-3.5 transition-transform', expanded && 'rotate-180')}
            />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
