import type { MultiAction } from './data-table-toolbar-actions';
import { DataTableToolbarActions } from './data-table-toolbar-actions';
import { DataTable } from '@datum-cloud/datum-ui/data-table';
import { PageTitle } from '@datum-ui/components/page-title';
import { cn } from '@shadcn/lib/utils';
import type { ReactNode } from 'react';

export interface DataTableToolbarProps<TData = unknown> {
  variant?: 'compact' | 'stacked';
  title?: string;
  description?: ReactNode;
  search?: boolean | { placeholder?: string };
  filters?: ReactNode[];
  actions?: ReactNode[];
  multiActions?: MultiAction<TData>[];
  className?: string;
}

export function DataTableToolbar<TData = unknown>({
  variant = 'compact',
  title,
  description,
  search,
  filters,
  actions,
  multiActions,
  className,
}: DataTableToolbarProps<TData>) {
  const searchPlaceholder = typeof search === 'object' ? search.placeholder : 'Search...';

  return (
    <div className={cn('space-y-4', className)}>
      {title && <PageTitle title={title} description={description} actionsPosition="inline" />}
      <div
        className={cn(
          'flex w-full flex-wrap items-center gap-2',
          variant === 'stacked' && 'flex-col'
        )}>
        {search && (
          <DataTable.Search placeholder={searchPlaceholder} className="w-full flex-1 sm:max-w-md" />
        )}
        {filters}
        <div className="ml-auto flex items-center gap-2">
          {actions && actions.length > 0 && <>{actions}</>}
          {multiActions && multiActions.length > 0 && (
            <DataTableToolbarActions actions={multiActions} />
          )}
        </div>
      </div>
      {filters && filters.length > 0 && <DataTable.ActiveFilters />}
    </div>
  );
}
