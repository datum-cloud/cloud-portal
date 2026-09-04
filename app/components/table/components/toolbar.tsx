import { useInitialLoading } from '../hooks';
import type { MultiAction, RowData } from '../types';
import { useIsStandaloneEmpty } from './empty-state';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  DataTable,
  useDataTableSearch,
  useDataTableSelection,
} from '@datum-cloud/datum-ui/data-table';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { InputWithAddons } from '@datum-cloud/datum-ui/input-with-addons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Search as SearchIconLucide, X as XIconLucide } from 'lucide-react';
import { Children, type ReactNode } from 'react';

interface TableToolbarProps<TData extends RowData> {
  title?: string;
  description?: ReactNode;
  search?: string | true;
  filters?: ReactNode[];
  actions?: ReactNode | ReactNode[];
  /**
   * Rendered in the left group, immediately after the search input — e.g.
   * the live-updates control (the toggle plus its catch-up chip).
   */
  searchTrailing?: ReactNode;
  multiActions?: MultiAction<TData>[];
  headerExtra?: ReactNode;
}

/**
 * Toolbar rendered inside DataTable.Client / DataTable.Server.
 *
 * Layout: header (title/description) on top via PageTitle, then a tools
 * row with search on the left and filters + bulk actions + primary actions
 * on the right (space-between). Matches the CardList.Toolbar visual pattern.
 *
 * The header row is ALWAYS rendered when title or description is provided.
 * The tools row is hidden when the table is in the standalone-empty state
 * (no data, no filter) — at that point the only interactive surface should
 * be the EmptyContent card's CTA button.
 *
 * Internal — consumers never render this directly.
 */
export function TableToolbar<TData extends RowData>({
  title,
  description,
  search,
  filters,
  actions,
  searchTrailing,
  multiActions,
  headerExtra,
}: TableToolbarProps<TData>) {
  const hasHeaderRow = !!(title || description || headerExtra);

  return (
    <div className="flex flex-col gap-6">
      {hasHeaderRow && (
        <PageTitle
          title={title}
          description={description}
          descriptionClassName="max-w-none"
          actions={headerExtra}
          className={headerExtra ? 'items-start' : undefined}
        />
      )}
      <TableToolbarTools<TData>
        search={search}
        filters={filters}
        actions={actions}
        searchTrailing={searchTrailing}
        multiActions={multiActions}
      />
    </div>
  );
}

/**
 * Lower toolbar row: search (left) + filters/actions/bulk-actions (right).
 * Hidden entirely when the table is in the standalone-empty state.
 *
 * `clearSelection` is constructed locally via `setRowSelection({})`
 * because datum-ui's useDataTableSelection does not expose a
 * clearSelection helper directly. Injected into every multiAction.onClick.
 */
function TableToolbarTools<TData extends RowData>({
  search,
  filters,
  actions,
  searchTrailing,
  multiActions,
}: Omit<TableToolbarProps<TData>, 'title' | 'description'>) {
  const isStandaloneEmpty = useIsStandaloneEmpty();
  const isInitialLoading = useInitialLoading();
  const { setRowSelection } = useDataTableSelection<TData>();
  const clearSelection = () => setRowSelection({});

  const searchPlaceholder = typeof search === 'string' ? search : search ? 'Search' : undefined;

  const actionsArray = Array.isArray(actions) ? actions : actions ? [actions] : undefined;

  const hasLeft = searchPlaceholder !== undefined || !!searchTrailing;
  const hasRight = !!(
    (filters && filters.length) ||
    (actionsArray && actionsArray.length) ||
    (multiActions && multiActions.length)
  );
  const hasAny = hasLeft || hasRight;

  if (!hasAny || isStandaloneEmpty) return null;

  if (isInitialLoading) {
    return (
      <SkeletonTools
        hasSearch={searchPlaceholder !== undefined}
        hasSearchTrailing={!!searchTrailing}
        hasFilters={!!filters?.length}
        actionCount={actionsArray?.length ?? 0}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {/*
        `flex-wrap` — search's `min-w-full` (below) means it always claims
        100% of THIS row's width, by design (see TableSearchInput). That's
        exactly right when search is alone here, but once `searchTrailing`
        (the live-updates toggle + catch-up chip) shares the row, "100% for
        search" plus any width for the trailing controls no longer fits on
        one line below `sm:`. Rather than shrinking search to squeeze
        everything into one line — which starts clipping the placeholder
        long before the controls are usably small — let the row wrap:
        search keeps its full-width line, and the trailing controls drop to
        a second line beneath it. Safe to leave unconditional (not gated to
        below `sm:`) — from `sm:` up, search's own max-width/min-width rules
        keep this row well within the available width, so wrapping never
        engages there; it's a no-op safety net, not a second layout.
      */}
      <div className="flex w-full min-w-0 flex-1 flex-wrap items-center gap-3 sm:w-auto">
        {searchPlaceholder !== undefined && <TableSearchInput placeholder={searchPlaceholder} />}
        {searchTrailing}
      </div>
      {hasRight && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {filters}
          {multiActions && multiActions.length > 0 && (
            <DataTable.BulkActions<TData>>
              {(selectedRows) => (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-sm" data-slot="dt-selection-count">
                    {selectedRows.length} selected
                  </span>
                  {multiActions.map((action, i) => (
                    <Button
                      key={`${action.label}-${i}`}
                      type={action.variant === 'destructive' ? 'danger' : 'quaternary'}
                      theme="outline"
                      size="small"
                      disabled={action.disabled}
                      onClick={() => action.onClick(selectedRows, { clearSelection })}
                      icon={action.icon}
                      iconPosition="left"
                      className={cn('w-full sm:w-auto')}>
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </DataTable.BulkActions>
          )}
          {actionsArray && Children.toArray(actionsArray)}
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton layout for the toolbar tools row. Rendered while the table is in
 * its initial-load phase. Mirrors the real layout so the toolbar doesn't
 * shift when content materialises.
 *
 * - Search: fixed skeleton matching the real InputWithAddons dimensions.
 * - Search-trailing: one `h-9` pill after the search skeleton — matches the
 *   live-updates control's slot so the left group doesn't shift width once
 *   the real control mounts.
 * - Filters: always 2 pills when the consumer passed any `filters` — gives
 *   a stable "chips" look without needing to match real filter count.
 * - Actions: one `h-9` pill per real action slot so the right side keeps
 *   its width (user asked for matching widths).
 *
 * All sections skip rendering when the consumer didn't pass that slot,
 * matching the real-toolbar "hide if not passed" rule.
 */
function SkeletonTools({
  hasSearch,
  hasSearchTrailing,
  hasFilters,
  actionCount,
}: {
  hasSearch: boolean;
  hasSearchTrailing: boolean;
  hasFilters: boolean;
  actionCount: number;
}) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {(hasSearch || hasSearchTrailing) && (
        <div className="flex w-full min-w-0 flex-1 flex-wrap items-center gap-3 sm:w-auto">
          {hasSearch && (
            <Skeleton className="h-9 w-full min-w-full rounded-md sm:max-w-3xs md:min-w-80" />
          )}
          {hasSearchTrailing && <Skeleton className="h-9 w-20 shrink-0 rounded-md" />}
        </div>
      )}
      {(hasFilters || actionCount > 0) && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {hasFilters && (
            <>
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </>
          )}
          {Array.from({ length: actionCount }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Custom search input. Mirrors the CardList.Search visual (InputWithAddons
 * with leading search icon + clear trailing button) but reads/writes
 * datum-ui's store via `useDataTableSearch` so URL-sync + filter reset
 * behaviour still works.
 */
function TableSearchInput({ placeholder }: { placeholder: string }) {
  const { search, setSearch, clearSearch } = useDataTableSearch();
  const value = typeof search === 'string' ? search : '';

  return (
    <div className="w-full min-w-full flex-1 rounded-md sm:max-w-3xs md:min-w-80">
      <InputWithAddons
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next === '') clearSearch();
          else setSearch(next);
        }}
        containerClassName="h-9 bg-transparent"
        className="placeholder:text-secondary text-secondary h-full bg-transparent text-xs placeholder:text-xs md:text-xs dark:text-white dark:placeholder:text-white"
        leading={
          <Icon
            icon={SearchIconLucide}
            size={14}
            className="text-icon-quaternary dark:text-white"
          />
        }
        trailing={
          value ? (
            <Button
              type="quaternary"
              theme="borderless"
              size="icon"
              onClick={() => clearSearch()}
              className="hover:text-destructive text-icon-quaternary size-4 p-0 hover:bg-transparent dark:text-white">
              <Icon icon={XIconLucide} size={14} />
              <span className="sr-only">Clear search</span>
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
