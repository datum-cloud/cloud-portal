import type { ColumnDef } from '@tanstack/react-table'
import type { ActionItem } from '@datum-cloud/datum-ui/data-table'
import { DataTable } from '@datum-cloud/datum-ui/data-table'

/**
 * Creates a standardized actions column for data tables.
 * Supports both static action lists and dynamic actions based on row data.
 *
 * @example
 * ```tsx
 * const columns = [
 *   columnHelper.accessor('name', { header: 'Name' }),
 *   createActionsColumn<Organization>([
 *     {
 *       label: 'Edit',
 *       onClick: (row) => navigate(`/org/${row.id}/edit`),
 *     },
 *     {
 *       label: 'Delete',
 *       onClick: (row) => deleteOrg(row.id),
 *       variant: 'destructive',
 *     },
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
 *       actions.push({
 *         label: 'Archive',
 *         onClick: () => archiveOrg(row.id),
 *         variant: 'destructive',
 *       })
 *     }
 *     return actions
 *   }),
 * ]
 * ```
 */
export function createActionsColumn<TData>(
  actions: ActionItem<TData>[] | ((row: TData) => ActionItem<TData>[])
): ColumnDef<TData> {
  return {
    id: '_actions',
    header: () => null,
    cell: ({ row }) => (
      <DataTable.RowActions
        row={row}
        actions={typeof actions === 'function' ? actions(row.original) : actions}
      />
    ),
  }
}
