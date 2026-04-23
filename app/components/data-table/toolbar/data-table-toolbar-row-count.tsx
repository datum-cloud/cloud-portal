'use client'

import { useDataTableRows } from '@datum-cloud/datum-ui/data-table'

export function DataTableToolbarRowCount() {
  const { rows } = useDataTableRows()
  if (rows.length === 0) return null
  return (
    <span className="text-muted-foreground hidden text-xs whitespace-nowrap sm:inline">
      {rows.length} {rows.length === 1 ? 'row' : 'rows'}
    </span>
  )
}
