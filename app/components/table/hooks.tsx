import { createActionsColumn, type ActionsColumnOptions } from './columns';
import type { RowAction, TableClientProps } from './types';
import { useDataTableLoading, useNuqsAdapter } from '@datum-cloud/datum-ui/data-table';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import type { Column, ColumnDef } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';

/**
 * Wraps datum-ui's useNuqsAdapter. Returns undefined when the consumer
 * passed `urlSync={false}`, which tells DataTable.Client/Server to skip URL
 * synchronization entirely.
 *
 * Also translates between the store's 0-indexed `pageIndex` and a 1-indexed
 * URL `?page=` param so the query string matches the page number the user
 * actually sees in the pagination bar:
 *
 *   UI page 1 (pageIndex 0) → URL: no `page` param (nuqs strips the default)
 *   UI page 2 (pageIndex 1) → URL: `?page=2`
 *   UI page 3 (pageIndex 2) → URL: `?page=3`
 *
 * The nuqs adapter writes `page: 0` for pageIndex 0, which gets stripped as
 * the default value, keeping the URL clean for the first page.
 */
export function useTableUrlAdapter(
  urlSync?: boolean
): ReturnType<typeof useNuqsAdapter> | undefined {
  const adapter = useNuqsAdapter();
  return useMemo(() => {
    if (urlSync === false) return undefined;
    return {
      read: () => {
        const persisted = adapter.read();
        const rawPageIndex = persisted.pageIndex;
        // URL `?page=N` maps to store pageIndex `N - 1` for N >= 2.
        // `?page=1` and the default (absent param -> 0) both mean page 1.
        const translatedPageIndex =
          typeof rawPageIndex === 'number' && rawPageIndex >= 2 ? rawPageIndex - 1 : 0;
        return { ...persisted, pageIndex: translatedPageIndex };
      },
      write: (state) => {
        const pageIndex = state.pageIndex ?? 0;
        const urlPage = pageIndex > 0 ? pageIndex + 1 : 0;
        adapter.write({ ...state, pageIndex: urlPage });
      },
    };
  }, [adapter, urlSync]);
}

/**
 * Appends an auto-generated actions column when `rowActions` is provided,
 * AND wraps any column with a string header so its header renders through
 * `SortableHeader`. That component emits the sort arrows when
 * `column.getCanSort()` is true and an info-icon tooltip when
 * `meta.tooltip` is set — matching the `DataTableColumnHeader` visual
 * from `@datum-cloud/datum-ui/data-table`.
 *
 * Columns with a function/ReactNode header are left alone so the consumer
 * keeps full control over the rendering.
 *
 * The auto-appended actions column keeps `header: () => null` so
 * `custom.css`'s `[data-slot='dt-header-cell']:last-child:empty` selector
 * still matches and pins it to the right.
 */
export function useResolvedColumns<TData>(
  columns: ColumnDef<TData>[],
  rowActions?: RowAction<TData>[],
  actionsOptions?: ActionsColumnOptions<TData>
): ColumnDef<TData>[] {
  const { hideRowActions, disableRowActions, maxInlineActions } = actionsOptions ?? {};
  return useMemo(() => {
    // Normalize ids FIRST: both `withSortableHeader` and `withSkeletonHeader`
    // replace string headers with function headers. Tanstack then requires a
    // column id (or accessorKey) — otherwise column resolution throws
    // "Columns require an id when using a non-string header". Synthesize one
    // from the original string header so consumers don't have to duplicate
    // the header as a manual `id`.
    const transformed = columns.map(ensureColumnId).map(withSortableHeader).map(withSkeletonHeader);
    if (!rowActions || rowActions.length === 0) return transformed;
    return [
      ...transformed,
      createActionsColumn<TData>(rowActions, {
        hideRowActions,
        disableRowActions,
        maxInlineActions,
      }),
    ];
  }, [columns, rowActions, hideRowActions, disableRowActions, maxInlineActions]);
}

/**
 * Ensure every column has a stable tanstack id. If the consumer already set
 * `id` or `accessorKey`, leave it alone. Otherwise derive an id from the
 * string header (slugified), falling back to `_col_<index>` for empty or
 * non-string headers. Prevents "Columns require an id when using a
 * non-string header" errors after `withSortableHeader`/`withSkeletonHeader`
 * replace string headers with function headers.
 */
function ensureColumnId<TData>(col: ColumnDef<TData>, index: number): ColumnDef<TData> {
  if ('id' in col && col.id) return col;
  if ('accessorKey' in col && (col as { accessorKey?: string }).accessorKey) return col;
  const header = col.header;
  // Slug non-word characters (punctuation, emoji, non-ASCII) so headers like
  // "First Name" and "first name" still collide the same way as two identical
  // strings, and so punctuation doesn't leak into the id. Empty/non-string
  // headers fall back to a positional id.
  const trimmed = typeof header === 'string' ? header.trim() : '';
  const synthesizedId =
    trimmed.length > 0
      ? trimmed
          .toLowerCase()
          .replace(/[^\w]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : `_col_${index}`;
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[Table] Column at index ${index} has no \`id\` or \`accessorKey\` — synthesized id "${synthesizedId}". Set an explicit \`id\` to avoid collisions.`
    );
  }
  return { ...col, id: synthesizedId } as ColumnDef<TData>;
}

/**
 * Wraps a column's existing header so it renders a skeleton block while the
 * table is in its initial-loading phase (see `useInitialLoading`). The
 * `_actions` column is skipped so the trailing sticky column stays empty
 * during loading — matching custom.css's `:last-child:empty` rule.
 */
function withSkeletonHeader<TData>(col: ColumnDef<TData>): ColumnDef<TData> {
  if (col.id === '_actions') return col;
  const originalHeader = col.header;
  return {
    ...col,
    header: (ctx) => <SkeletonOrHeader originalHeader={originalHeader} ctx={ctx} />,
  } as ColumnDef<TData>;
}

function SkeletonOrHeader({ originalHeader, ctx }: { originalHeader: unknown; ctx: unknown }) {
  const isLoading = useInitialLoading();
  if (isLoading) {
    // Wrap in the same container the real non-sortable header uses so the
    // cell's padding/alignment (from custom.css `[data-slot='dt-header-cell']`)
    // reads identically between loading and loaded states.
    return (
      <div data-slot="dt-column-header" className="flex items-center">
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>
    );
  }
  if (typeof originalHeader === 'function') {
    return (originalHeader as (c: unknown) => ReactNode)(ctx) as ReactNode;
  }
  if (originalHeader == null) return null;
  return originalHeader as ReactNode;
}

/**
 * Returns `true` only during the first loading phase of the current table —
 * i.e. `isLoading === true` AND the table has not yet transitioned to
 * `isLoading === false` at least once.
 *
 * - **Server mode:** datum-ui's fetch loop flips `isLoading` automatically;
 *   the latch engages after the first fetch completes. Subsequent refetches
 *   (pagination, refetchKey, etc.) no longer trigger skeleton rendering.
 * - **Client mode:** consumer-supplied `loading` prop is synced into
 *   `isLoading` by datum-ui's provider; same latch applies. SSR'd data with
 *   `loading={false}` engages the latch immediately, so no skeleton flash.
 *
 * Must be called inside `DataTable.Client` / `DataTable.Server`.
 */
export function useInitialLoading(): boolean {
  const { isLoading } = useDataTableLoading();
  const hasCompletedFirstLoad = useRef(false);
  if (!isLoading && !hasCompletedFirstLoad.current) {
    hasCompletedFirstLoad.current = true;
  }
  return isLoading && !hasCompletedFirstLoad.current;
}

/**
 * Wraps a column's string header with `SortableHeader`. Columns whose
 * header is a function or ReactNode are returned unchanged so consumers
 * that build their own headers keep full control.
 */
function withSortableHeader<TData>(col: ColumnDef<TData>): ColumnDef<TData> {
  if (col.id === '_actions') return col;
  if (typeof col.header !== 'string') return col;

  const title = col.header;
  const meta = col.meta as { tooltip?: ReactNode } | undefined;
  const tooltip = meta?.tooltip;

  return {
    ...col,
    header: ({ column }) => (
      <SortableHeader column={column as Column<TData, unknown>} title={title} tooltip={tooltip} />
    ),
  } as ColumnDef<TData>;
}

interface SortableHeaderProps<TData> {
  column: Column<TData, unknown>;
  title: string;
  tooltip?: ReactNode;
}

/**
 * Column header with sort arrows + optional tooltip. Mirrors the old
 * fork's `DataTableColumnHeader` — same icon set (ChevronUp/ChevronDown),
 * same 25%/100% opacity treatment, same info-icon classes.
 */
function SortableHeader<TData>({ column, title, tooltip }: SortableHeaderProps<TData>) {
  const canSort = column.getCanSort();
  const sorted = column.getIsSorted();
  const hasTooltip = tooltip !== undefined && tooltip !== null && tooltip !== false;

  const titleBlock = (
    <span className="flex items-center gap-2">
      <span>{title}</span>
      {hasTooltip && (
        <Tooltip message={tooltip}>
          <Icon
            icon={Info}
            className="text-muted-foreground/70 size-3.5 shrink-0"
            aria-hidden="true"
          />
        </Tooltip>
      )}
    </span>
  );

  if (!canSort) {
    return <div data-slot="dt-column-header">{titleBlock}</div>;
  }

  return (
    <div
      className="flex h-full cursor-pointer items-center justify-between gap-1 select-none"
      onClick={column.getToggleSortingHandler()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          column.getToggleSortingHandler()?.(e);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Sort by ${title}${
        sorted === 'asc' ? ', sorted ascending' : sorted === 'desc' ? ', sorted descending' : ''
      }`}
      data-slot="dt-column-header">
      {titleBlock}
      <div className="flex flex-col">
        <Icon
          icon={ChevronUp}
          size={10}
          aria-hidden="true"
          className={cn(
            'text-foreground -mb-0.5 stroke-2 opacity-25 transition-all',
            sorted === 'asc' && 'opacity-100'
          )}
        />
        <Icon
          icon={ChevronDown}
          size={10}
          aria-hidden="true"
          className={cn(
            'text-foreground -mt-0.5 stroke-2 opacity-25 transition-all',
            sorted === 'desc' && 'opacity-100'
          )}
        />
      </div>
    </div>
  );
}

/**
 * Dev-only console.warn when both `inline` and `onRowClick` are provided on
 * Table.Client. `inline` wins at render time (onRowClick is wiped before
 * being forwarded to TableContent) — this warning surfaces the conflict.
 */
export function useInlineConflictWarning<TData>(
  props: Pick<TableClientProps<TData>, 'inline' | 'onRowClick'>
): void {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (props.inline && props.onRowClick) {
      console.warn(
        '[Table.Client] `inline` and `onRowClick` were both provided. ' +
          '`inline` will render; `onRowClick` is ignored. Remove one.'
      );
    }
  }, [props.inline, props.onRowClick]);
}
