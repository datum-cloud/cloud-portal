import { Button } from '@datum-cloud/datum-ui/button';
import { DataTable, useDataTablePagination } from '@datum-cloud/datum-ui/data-table';
import { Icon } from '@datum-cloud/datum-ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_SIMPLE_PAGE_SIZES = [10, 20, 30, 50] as const;

interface ConditionalPaginationProps {
  /**
   * When true, always render the pagination bar regardless of pageCount.
   * Server-mode tables need to display "X of Y" and page-size controls
   * even when the total happens to fit in one page.
   */
  serverSide?: boolean;
  /**
   * - `true` / undefined → full DataTable.Pagination (page size + page
   *   numbers + prev/next).
   * - `'simple'` → minimal Prev/Next buttons only. Intended for cursor-based
   *   server tables where total count and page numbers aren't meaningful.
   */
  variant?: boolean | 'simple';
}

/**
 * Pagination bar that mirrors the old DataTable conditional-render rule:
 * only render when multiple pages exist, OR server-side mode is on. Single
 * page in client-mode -> nothing rendered (no floating "1 of 1" bar).
 *
 * Reads pageCount from datum-ui's `useDataTablePagination`. Must be
 * rendered inside DataTable.Client / DataTable.Server.
 */
export function ConditionalPagination({ serverSide, variant = true }: ConditionalPaginationProps) {
  const { pageCount, canNextPage, canPrevPage } = useDataTablePagination();

  if (variant === false) return null;

  if (variant === 'simple') {
    // Client-mode with no navigation available → hide entirely.
    if (!serverSide && !canNextPage && !canPrevPage) return null;
    return <SimplePagination />;
  }

  if (!serverSide && pageCount <= 1) return null;
  return <DataTable.Pagination className="datum-ui-data-table__pagination" />;
}

/**
 * Minimal Prev/Next pagination. Suitable for cursor-based server tables
 * (e.g. activity logs) where the server returns a `continue` token per
 * response and the total row count / page number is unknown.
 *
 * Includes a "Rows per page" selector and a local page indicator. The page
 * number reflects how many next/prev clicks have happened in this session,
 * not a server-side total (which cursor pagination doesn't expose).
 */
function SimplePagination() {
  const { canNextPage, canPrevPage, nextPage, prevPage, pageIndex, pageSize, setPageSize } =
    useDataTablePagination();

  return (
    <nav
      data-slot="dt-pagination"
      aria-label="Table pagination"
      className="datum-ui-data-table__pagination flex flex-wrap items-center justify-between gap-3 px-2 py-4">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <span>Rows per page</span>
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="h-8 w-[72px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEFAULT_SIMPLE_PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">Page {pageIndex + 1}</span>
        <div className="flex items-center gap-1">
          <Button
            type="primary"
            theme="outline"
            size="icon"
            className="size-8"
            disabled={!canPrevPage}
            onClick={() => prevPage()}
            aria-label="Previous page">
            <Icon icon={ChevronLeft} className="size-4" />
          </Button>
          <Button
            type="primary"
            theme="outline"
            size="icon"
            className="size-8"
            disabled={!canNextPage}
            onClick={() => nextPage()}
            aria-label="Next page">
            <Icon icon={ChevronRight} className="size-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
