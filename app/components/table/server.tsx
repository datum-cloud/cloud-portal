import { TableContent } from './components/content';
import { TableBodyOrEmpty, resolveError } from './components/empty-state';
import { ConditionalPagination } from './components/pagination';
import { TablePanel } from './components/panel';
import { TableToolbar } from './components/toolbar';
import { useResolvedColumns, useTableUrlAdapter } from './hooks';
import type { TableServerProps, TableServerRef } from './types';
import { detectToolbar, toolbarPropsFrom } from './utils';
import { DataTable, useDataTableLoading } from '@datum-cloud/datum-ui/data-table';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from 'react';

/**
 * Server-side data table entry point. Wraps datum-ui's DataTable.Server with
 * the cloud-portal toolbar, panel shell, empty/error resolvers, and refetch
 * plumbing. Compose via `Table.Server` (see `./table.tsx`).
 *
 * Layout:
 * - Toolbar on top (title/description always; search/filters/actions row
 *   hides when the table is standalone-empty).
 * - Bordered table panel, then pagination OUTSIDE the border. Server-side
 *   pagination always renders (to show total and page-size controls).
 * - When the fetched result is empty AND no filter/search active, the
 *   table chrome is suppressed and only the EmptyContent card renders.
 *
 * Refetch mechanism:
 * - datum-ui's DataTable.Server does NOT expose a ref or refetch method.
 * - We bump an internal `fetchNonce` and pass it as React `key` on
 *   DataTable.Server. A key change remounts the subtree, which creates a new
 *   store and triggers a fresh fetch.
 * - `refetchKey` (consumer-controlled) and the imperative `ref.refetch()`
 *   both funnel into the same internal nonce.
 *
 * Error delegation:
 * - `onError` is invoked from an inner component (`ErrorBridge`) that reads
 *   the store's error state via `useDataTableLoading`.
 * - `errorContent` (ReactNode or render function) is resolved by
 *   `resolveError` into a `(err, refetch) -> ReactNode` renderer that
 *   TableContent renders when the store has an error.
 */
function TableServerImpl<TData, TResponse>(
  props: TableServerProps<TData, TResponse>,
  ref: Ref<TableServerRef>
) {
  const stateAdapter = useTableUrlAdapter(props.urlSync ?? true);
  const columns = useResolvedColumns(props.columns, props.rowActions, {
    hideRowActions: props.hideRowActions,
    disableRowActions: props.disableRowActions,
    maxInlineActions: props.maxInlineActions,
  });
  const hasToolbar = detectToolbar(props);
  const hasActionsColumn =
    !!props.rowActions?.length || props.columns.some((c) => c.id === '_actions');

  // Internal refetch counter — bumping it forces a remount of DataTable.Server
  // because it's used as the React `key` below.
  const [fetchNonce, setFetchNonce] = useState(0);
  const refetch = useCallback(() => setFetchNonce((n) => n + 1), []);

  useImperativeHandle(ref, () => ({ refetch }), [refetch]);

  // When the consumer bumps `refetchKey`, trigger the internal refetch.
  // Skip the very first run so mount doesn't immediately remount.
  const isInitial = useRef(true);
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    refetch();
  }, [props.refetchKey, refetch]);

  const errorRenderer = resolveError(props.errorContent);

  return (
    <DataTable.Server<TResponse, TData>
      key={fetchNonce}
      stateAdapter={stateAdapter}
      columns={columns}
      fetchFn={props.fetchFn}
      transform={props.transform}
      limit={props.limit}
      defaultFilters={props.defaultFilters}
      getRowId={props.getRowId}
      enableRowSelection={!!props.multiActions?.length}
      className={cn('space-y-4', props.className)}>
      <ErrorBridge onError={props.onError} />

      {hasToolbar && <TableToolbar<TData> {...toolbarPropsFrom(props)} />}

      <TableBodyOrEmpty<TData> empty={props.empty}>
        <TablePanel>
          <TableContent<TData>
            errorContent={errorRenderer}
            onRowClick={props.onRowClick}
            onRefetch={refetch}
            stickyActionsColumn={hasActionsColumn}
          />
        </TablePanel>
        {props.pagination !== false && (
          <ConditionalPagination serverSide variant={props.pagination} />
        )}
      </TableBodyOrEmpty>
    </DataTable.Server>
  );
}

/**
 * Reads the store's error state and invokes `onError` whenever it transitions
 * to a non-null Error. Renders nothing.
 */
function ErrorBridge({ onError }: { onError?: (error: Error) => void }) {
  const { error } = useDataTableLoading();
  useEffect(() => {
    if (error && onError) onError(error);
  }, [error, onError]);
  return null;
}

// forwardRef with generics requires a type assertion — standard React pattern.
export const TableServer = forwardRef(TableServerImpl) as <TData, TResponse = unknown>(
  props: TableServerProps<TData, TResponse> & { ref?: Ref<TableServerRef> }
) => ReturnType<typeof TableServerImpl>;
