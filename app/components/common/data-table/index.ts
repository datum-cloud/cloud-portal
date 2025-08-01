// Export main DataTable component
export { DataTable } from './data-table';

// Export all sub-components
export { DataTableHeader } from './data-table-header';
export { DataTableLoading } from './data-table-loading';
export { DataTablePagination } from './data-table-pagination';
export { DataTableRowActions } from './data-table-row-actions';
// Re-export EmptyState as DataTableEmpty for backward compatibility
export { EmptyState as DataTableEmpty } from '@/components/common/empty-state';

// Export all types
export * from './data-table.types';
