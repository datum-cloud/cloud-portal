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
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  DownloadIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

// Preserve the inset that the (now removed) leading checkbox column used to
// give us — the first/last cells of every row line up with the card padding.
const ROW_INSET =
  '[&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td:first-child]:pl-5 [&_td:last-child]:pr-5';

// Vertical dividers between header cells (skip the trailing actions column).
const HEADER_DIVIDERS = '[&_th:not(:last-child)]:border-r [&_th]:border-border';

export type InvoiceStatus = 'paid' | 'open' | 'failed' | 'void';

export type Invoice = {
  id: string;
  date: string;
  amount: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  downloadUrl?: string;
};

const statusBadge: Record<
  InvoiceStatus,
  { label: string; type: 'success' | 'warning' | 'danger' | 'muted' }
> = {
  paid: { label: 'Paid', type: 'success' },
  open: { label: 'Open', type: 'warning' },
  failed: { label: 'Failed', type: 'danger' },
  void: { label: 'Void', type: 'muted' },
};

type SortColumn = 'date' | 'amount' | 'invoiceNumber' | 'status';
type SortDirection = 'asc' | 'desc';

// Comparable representation of each sortable column.
const sortAccessors: Record<SortColumn, (invoice: Invoice) => number | string> = {
  date: (invoice) => {
    const time = Date.parse(invoice.date);
    return Number.isNaN(time) ? invoice.date : time;
  },
  amount: (invoice) => Number.parseFloat(invoice.amount.replace(/[^0-9.-]/g, '')) || 0,
  invoiceNumber: (invoice) => invoice.invoiceNumber,
  status: (invoice) => invoice.status,
};

interface SortableHeadProps {
  column: SortColumn;
  label: string;
  sort: { column: SortColumn; direction: SortDirection } | null;
  onSort: (column: SortColumn) => void;
}

const SortableHead = ({ column, label, sort, onSort }: SortableHeadProps) => {
  const isActive = sort?.column === column;
  const SortIcon = !isActive
    ? ChevronsUpDownIcon
    : sort.direction === 'asc'
      ? ChevronUpIcon
      : ChevronDownIcon;

  return (
    <TableHead className="text-foreground text-xs font-medium">
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-sort={isActive ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        className="hover:text-foreground/80 flex w-full items-center gap-1.5 text-left transition-colors">
        <span>{label}</span>
        <Icon
          icon={SortIcon}
          className={cn('size-3.5', isActive ? 'text-foreground' : 'text-muted-foreground')}
        />
      </button>
    </TableHead>
  );
};

interface PastInvoicesCardProps {
  invoices: Invoice[];
  pageSize?: number;
  onDownload?: (invoice: Invoice) => void;
}

export const PastInvoicesCard = ({ invoices, pageSize = 5, onDownload }: PastInvoicesCardProps) => {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ column: SortColumn; direction: SortDirection } | null>({
    column: 'date',
    direction: 'desc',
  });

  const handleSort = (column: SortColumn) => {
    setSort((prev) => {
      if (prev?.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });
    setPage(1);
  };

  const sortedInvoices = useMemo(() => {
    if (!sort) return invoices;
    const accessor = sortAccessors[sort.column];
    const multiplier = sort.direction === 'asc' ? 1 : -1;
    return [...invoices].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return -1 * multiplier;
      if (av > bv) return 1 * multiplier;
      return 0;
    });
  }, [invoices, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedInvoices.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedInvoices.length);

  const visibleInvoices = useMemo(
    () => sortedInvoices.slice(startIndex, endIndex),
    [sortedInvoices, startIndex, endIndex]
  );

  return (
    <Card className="gap-0 overflow-hidden rounded-xl py-0 shadow-none">
      <CardContent className="p-0">
        <Table className={cn(ROW_INSET, HEADER_DIVIDERS)}>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <SortableHead column="date" label="Date" sort={sort} onSort={handleSort} />
              <SortableHead column="amount" label="Amount" sort={sort} onSort={handleSort} />
              <SortableHead
                column="invoiceNumber"
                label="Invoice Number"
                sort={sort}
                onSort={handleSort}
              />
              <SortableHead column="status" label="Status" sort={sort} onSort={handleSort} />
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleInvoices.map((invoice) => {
              const badge = statusBadge[invoice.status];
              return (
                <TableRow key={invoice.id}>
                  <TableCell className="text-sm">{invoice.date}</TableCell>
                  <TableCell className="text-sm">{invoice.amount}</TableCell>
                  <TableCell className="text-sm">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    <Badge type={badge.type} theme="light" className="text-2xs uppercase">
                      {badge.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-12 text-right">
                    <Button
                      htmlType="button"
                      type="quaternary"
                      theme="outline"
                      size="xs"
                      onClick={() => onDownload?.(invoice)}
                      aria-label={`Download invoice ${invoice.invoiceNumber}`}
                      icon={<Icon icon={DownloadIcon} className="size-3.5" />}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="text-muted-foreground bg-background flex items-center justify-between border-t px-5 py-3 text-xs">
        <span>
          Showing {invoices.length === 0 ? 0 : startIndex + 1} to {endIndex} out of{' '}
          {invoices.length} invoices
        </span>
        <div className="flex items-center gap-1">
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="xs"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
            icon={<Icon icon={ChevronLeftIcon} className="size-3.5" />}
          />
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="xs"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next page"
            icon={<Icon icon={ChevronRightIcon} className="size-3.5" />}
          />
        </div>
      </CardFooter>
    </Card>
  );
};
