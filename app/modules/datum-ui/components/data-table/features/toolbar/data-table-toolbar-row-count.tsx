import { useDataTable } from '../../core/data-table.context';

/**
 * Component to display the filtered row count with pagination and selection information
 *
 * Display modes:
 * - Selection: "X selected" (when rows are selected)
 * - Paginated: "Showing X-Y of Z records" (when paginated, no selection)
 * - All shown: "Showing X records" (when all fit on one page, no selection)
 */
export function DataTableToolbarRowCount() {
  const { table, selectionCount, hasSelection } = useDataTable();
  const totalFiltered = table.getFilteredRowModel().rows.length;

  // Hide if no records
  if (totalFiltered === 0) {
    return null;
  }

  // If rows are selected, show selection count instead
  if (hasSelection) {
    return (
      <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">
        {selectionCount} of {totalFiltered} selected
      </span>
    );
  }

  const currentPageRows = table.getRowModel().rows.length;
  const pagination = table.getState().pagination;
  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;

  // Check if pagination is enabled (if pageSize is less than total, we're paginating)
  const isPaginated = pageSize < totalFiltered && currentPageRows > 0;

  let displayText: string;

  if (isPaginated) {
    // Calculate the range being shown
    const start = pageIndex * pageSize + 1;
    const end = Math.min((pageIndex + 1) * pageSize, totalFiltered);

    displayText = `Showing ${start}-${end} of ${totalFiltered} ${totalFiltered === 1 ? 'record' : 'records'}`;
  } else {
    // All records are shown (no pagination or all fit on one page)
    displayText = `Showing ${totalFiltered} ${totalFiltered === 1 ? 'record' : 'records'}`;
  }

  return (
    <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">
      {displayText}
    </span>
  );
}
