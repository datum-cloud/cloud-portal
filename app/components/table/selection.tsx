import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import type { SelectionColumnOptions } from '@datum-cloud/datum-ui/data-table';
import type { RowData } from '@tanstack/react-table';
import { useMemo } from 'react';

/**
 * `enableRowSelection` for a table: off without bulk actions, the default
 * checkbox column when every row is selectable, and the per-row one otherwise.
 * Memoized because datum-ui rebuilds its columns whenever this value changes
 * identity; pass a stable `isRowSelectable` (a module-level function).
 */
export function useRowSelection<TData extends RowData>(
  hasMultiActions: boolean,
  isRowSelectable?: (row: TData) => boolean
): boolean | SelectionColumnOptions<TData> {
  return useMemo(() => {
    if (!hasMultiActions) return false;
    return isRowSelectable ? selectionColumnFor(isRowSelectable) : true;
  }, [hasMultiActions, isRowSelectable]);
}

/**
 * Checkbox column for tables where some rows can't take part in a bulk
 * action. Those rows get a disabled checkbox rather than none, so the column
 * stays aligned, and "select all" only picks the rows that can be selected.
 * datum-ui has no per-row selection option, hence the custom renderers.
 */
export function selectionColumnFor<TData extends RowData>(
  isRowSelectable: (row: TData) => boolean
): SelectionColumnOptions<TData> {
  return {
    renderHeader: ({ table }) => {
      const selectable = table.getRowModel().rows.filter((row) => isRowSelectable(row.original));
      const selectedCount = selectable.filter((row) => row.getIsSelected()).length;
      const allSelected = selectable.length > 0 && selectedCount === selectable.length;
      return (
        <Checkbox
          checked={allSelected || (selectedCount > 0 && 'indeterminate')}
          disabled={selectable.length === 0}
          // One update for the whole page: datum-ui's store keeps only the
          // last of several per-row toggles fired in the same tick.
          onCheckedChange={(value) => {
            const next = { ...table.store.state.rowSelection };
            for (const row of selectable) {
              if (value) next[row.id] = true;
              else delete next[row.id];
            }
            table.setRowSelection(next);
          }}
          aria-label="Select all"
        />
      );
    },
    renderCell: ({ row }) => {
      const selectable = isRowSelectable(row.original);
      return (
        <Checkbox
          checked={selectable && row.getIsSelected()}
          disabled={!selectable}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={selectable ? 'Select row' : "This row can't be selected"}
        />
      );
    },
  };
}
