import type { EmptyContentConfig } from '../types';
import {
  useDataTableFilters,
  useDataTableLoading,
  useDataTableRows,
  useDataTableSearch,
} from '@datum-cloud/datum-ui/data-table';
import { EmptyContent } from '@datum-cloud/datum-ui/empty-content';
import type { ReactNode } from 'react';

/**
 * Resolve an `empty` prop value into a ReactNode using the shared
 * EmptyContent primitive. Always returns a node. The default variant
 * (rounded border card) wraps the message so it reads as a standalone
 * block, not an inline table row.
 */
export function resolveEmpty(empty?: string | EmptyContentConfig): ReactNode {
  if (!empty) {
    return <EmptyContent title="No items found" className="w-full" />;
  }
  if (typeof empty === 'string') {
    return <EmptyContent title={empty} className="w-full" />;
  }
  // Map wrapper's EmptyContentConfig.actions (uses `href`) to
  // datum-ui's EmptyContentAction (uses `to`).
  const actions = empty.actions?.map((a) => ({
    label: a.label,
    type: a.type,
    onClick: a.onClick,
    to: a.href,
    icon: a.icon,
    variant: a.variant,
  }));
  return (
    <EmptyContent
      title={empty.title}
      subtitle={empty.description}
      actions={actions}
      className="w-full"
    />
  );
}

export type ErrorRenderer = (err: Error, refetch: () => void) => ReactNode;

/**
 * Resolve an `errorContent` prop (ReactNode, function, or undefined) into a
 * stable (err, refetch) -> ReactNode renderer. Falls back to a default error
 * state built from the same EmptyContent primitive.
 */
export function resolveError(errorContent?: ReactNode | ErrorRenderer): ErrorRenderer {
  if (typeof errorContent === 'function') {
    return errorContent as ErrorRenderer;
  }
  if (errorContent) {
    return () => errorContent;
  }
  return function DefaultErrorContent(err, refetch) {
    return (
      <EmptyContent
        title="Failed to load"
        subtitle={err.message}
        actions={[{ label: 'Retry', type: 'button', onClick: refetch }]}
        className="w-full"
      />
    );
  };
}

/**
 * Returns true when the table is in the "standalone-empty" state:
 * no data, no active filter/search, and not currently loading.
 *
 * Used by both `TableBodyOrEmpty` (swap table body for EmptyContent card)
 * and `TableToolbarTools` (hide search/filters/actions so the EmptyContent
 * is the only interactive element). Reads filter, search, rows, and
 * loading state from datum-ui context — must be called inside
 * DataTable.Client / DataTable.Server.
 */
export function useIsStandaloneEmpty(): boolean {
  const { search } = useDataTableSearch();
  const { filters } = useDataTableFilters();
  const { rows } = useDataTableRows();
  const { isLoading } = useDataTableLoading();

  const hasActiveFilter =
    (typeof search === 'string' && search.length > 0) ||
    (filters && Object.keys(filters).length > 0);

  const sourceIsEmpty = rows.length === 0;

  return !isLoading && sourceIsEmpty && !hasActiveFilter;
}

/**
 * Switches between the full table body (children) and a standalone
 * EmptyContent card.
 *
 * - Standalone-empty -> render only the EmptyContent card.
 * - Otherwise -> render the normal body (children). A filter that yields
 *   zero rows is handled by datum-ui's DataTable.Content internal empty
 *   message, NOT by this component — so users still see the toolbar with
 *   their filters in place and can adjust them.
 */
export function TableBodyOrEmpty<TData>({
  empty,
  children,
}: {
  empty?: string | EmptyContentConfig;
  children: ReactNode;
}) {
  // Generic is declared on the wrapper for consumer-visible type parity,
  // but the body decision does not depend on TData itself — the hook reads
  // rows as unknown[] and only inspects length.
  void (undefined as TData | undefined);

  const isStandaloneEmpty = useIsStandaloneEmpty();

  if (isStandaloneEmpty) {
    return <>{resolveEmpty(empty)}</>;
  }
  return <>{children}</>;
}
