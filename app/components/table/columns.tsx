import { RowActions } from './components/row-actions';
import type { RowAction } from './types';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import type { ColumnDef } from '@tanstack/react-table';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Options forwarded to the cell-level `<RowActions />` renderer.
 * Mirrors the Table.Client / Table.Server props of the same name.
 */
export type ActionsColumnOptions<TData> = {
  hideRowActions?: (row: TData) => boolean;
  disableRowActions?: (row: TData) => boolean;
  maxInlineActions?: number;
};

/**
 * Creates a standardized actions column for data tables.
 * Supports both static action lists and dynamic actions based on row data.
 *
 * The column is always appended last by `useResolvedColumns`. When
 * `rowActions` is passed to `Table.Client` / `Table.Server`, the wrapper
 * also sets `stickyActionsColumn` so the final column pins to the right.
 *
 * @example
 * ```tsx
 * const columns = [
 *   columnHelper.accessor('name', { header: 'Name' }),
 *   createActionsColumn<Organization>([
 *     { label: 'Edit', onClick: (row) => navigate(`/org/${row.id}/edit`) },
 *     { label: 'Delete', onClick: (row) => deleteOrg(row.id), variant: 'destructive' },
 *   ]),
 * ]
 * ```
 *
 * @example
 * ```tsx
 * // Dynamic actions based on row data
 * const columns = [
 *   columnHelper.accessor('name', { header: 'Name' }),
 *   createActionsColumn<Organization>((row) => {
 *     const actions: ActionItem<Organization>[] = [
 *       { label: 'Edit', onClick: () => navigate(`/org/${row.id}/edit`) },
 *     ]
 *     if (row.status === 'active') {
 *       actions.push({ label: 'Archive', onClick: () => archiveOrg(row.id), variant: 'destructive' })
 *     }
 *     return actions
 *   }),
 * ]
 * ```
 */
export function createActionsColumn<TData>(
  actions: RowAction<TData>[] | ((row: TData) => RowAction<TData>[]),
  options?: ActionsColumnOptions<TData>
): ColumnDef<TData> {
  return {
    id: '_actions',
    header: () => null,
    cell: ({ row }) => (
      <RowActions<TData>
        row={row.original}
        actions={typeof actions === 'function' ? actions(row.original) : actions}
        hideRowActions={options?.hideRowActions}
        disableRowActions={options?.disableRowActions}
        maxInlineActions={options?.maxInlineActions}
      />
    ),
  };
}

export interface ColumnHeaderOptions {
  /**
   * Tooltip text or node. Rendered next to the title via an info icon.
   * Omit to render the title as a plain string (no wrapper).
   */
  tooltip?: string | ReactNode;
}

/**
 * Builds a TanStack `header` value that optionally wraps the column title
 * with a tooltip. Returns the raw string when no tooltip is provided, so
 * simple columns stay sortable via datum-ui's default string-header path.
 *
 * @example
 * ```tsx
 * columnHelper.accessor('status', {
 *   header: columnHeader('Status', { tooltip: 'Current operational state.' }),
 * })
 *
 * // Plain (no tooltip) — equivalent to `header: 'Name'`
 * columnHelper.accessor('name', {
 *   header: columnHeader('Name'),
 * })
 * ```
 */
export function columnHeader(
  title: string,
  options?: ColumnHeaderOptions
): string | (() => ReactNode) {
  if (!options?.tooltip) return title;
  const tooltipContent = options.tooltip;
  return function HeaderWithTooltip() {
    return (
      <span className="flex items-center gap-2">
        {title}
        <Tooltip message={tooltipContent}>
          <Icon
            icon={Info}
            className="text-muted-foreground/70 size-3.5 shrink-0"
            aria-hidden="true"
          />
        </Tooltip>
      </span>
    );
  };
}
