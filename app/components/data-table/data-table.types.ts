import { Button } from '@/components/ui/button';
import { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/react-table';

export type SearchParams = {
  [key: string]: string | string[] | undefined;
};

// Interface Section
export interface DataTableProps<TData, TValue> {
  // Core data props
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // Filter and sorting props
  defaultColumnFilters?: ColumnFiltersState;
  defaultSorting?: SortingState;

  // Filter system (compound components)
  filterComponent?: React.ReactNode;

  // Display mode props
  mode?: 'table' | 'card';
  hideHeader?: boolean;

  // Styling props
  className?: string;
  tableContainerClassName?: string;
  tableClassName?: string;
  tableCardClassName?: string;

  // Actions and behavior props
  rowActions?: DataTableRowActionsProps<TData>[];
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string;
  tableTitle?: DataTableTitleProps;

  // Loading state props
  isLoading?: boolean;
  loadingText?: string;

  // Empty state props
  emptyContent?: DataTableEmptyContentProps;
}

export interface DataTableRowActionsProps<TData> {
  key: string;
  label: string;
  variant?: 'default' | 'destructive';
  icon?: React.ReactNode;
  className?: string;
  action: (row: TData) => void | Promise<void>;
  isDisabled?: (row: TData) => boolean;
}

export interface DataTableTitleProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export interface DataTableEmptyContentProps {
  title?: string;
  subtitle?: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  actions?: Array<{
    type: 'button' | 'link' | 'external-link';
    label: string;
    onClick?: () => void;
    to?: string;
    variant?: React.ComponentProps<typeof Button>['variant'];
    icon?: React.ReactNode;
  }>;
}
