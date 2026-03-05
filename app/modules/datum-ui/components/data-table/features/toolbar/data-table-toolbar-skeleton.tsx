import { Skeleton } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';

export interface DataTableToolbarSkeletonProps {
  /** Layout mode - matches DataTableToolbar compact vs stacked */
  layout?: 'stacked' | 'compact';
  /** Actual title text to show (no skeleton when provided) */
  title?: string;
  /** Actual description to show (no skeleton when provided) */
  description?: React.ReactNode;
  /** Show title skeleton when no title prop (page title area) */
  showTitle?: boolean;
  /** Show description skeleton when no description prop */
  showDescription?: boolean;
  /** Show search bar skeleton in the toolbar row */
  showSearch?: boolean;
  /** Show filter dropdown / inline filter skeletons */
  showFilters?: boolean;
  /** Show primary action button skeleton */
  showActions?: boolean;
  className?: string;
}

/**
 * Skeleton loading state for the DataTable toolbar.
 * Matches the structure of DataTableToolbar (title, search, filters, actions) for both stacked and compact layouts.
 */
export function DataTableToolbarSkeleton({
  layout = 'compact',
  title,
  description,
  showTitle = true,
  showDescription = false,
  showSearch = true,
  showFilters = true,
  showActions = true,
  className,
}: DataTableToolbarSkeletonProps) {
  const hasTitleContent = title != null && title !== '';
  const hasDescriptionContent = description != null;

  if (layout === 'stacked') {
    return (
      <div className={cn('space-y-5', className)}>
        {/* Title row: title + description + actions */}
        {(hasTitleContent ||
          hasDescriptionContent ||
          showTitle ||
          showDescription ||
          showActions) && (
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              {hasTitleContent ? (
                <span className="text-2xl leading-none font-medium">{title}</span>
              ) : (
                showTitle && <Skeleton className="h-8 w-48 rounded-md" />
              )}
              {hasDescriptionContent ? (
                <div className="text-sm font-normal">{description}</div>
              ) : (
                showDescription && <Skeleton className="h-4 w-72 max-w-full rounded-md" />
              )}
            </div>
            {showActions && <Skeleton className="h-9 w-24 rounded-md" />}
          </div>
        )}

        {/* Filter row */}
        {showSearch && (
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-full max-w-md rounded-md" />
            {showFilters && (
              <>
                <Skeleton className="h-9 w-32 rounded-md" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Compact layout: title/description on top, then toolbar row (search | filters + actions)
  return (
    <div className={cn('space-y-5', className)}>
      {/* Title and description at top - real text when provided, else skeleton */}
      {(hasTitleContent || hasDescriptionContent || showTitle || showDescription) && (
        <div className="flex w-full flex-col gap-2">
          {hasTitleContent ? (
            <span className="text-2xl leading-none font-medium">{title}</span>
          ) : (
            showTitle && <Skeleton className="h-8 w-48 rounded-md" />
          )}
          {hasDescriptionContent ? (
            <div className="text-sm font-normal">{description}</div>
          ) : (
            showDescription && <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          )}
        </div>
      )}

      {/* Compact toolbar row: search (left) | filters + actions (right) */}
      {(showSearch || showFilters || showActions) && (
        <div className="flex w-full flex-row flex-wrap items-center justify-between gap-4">
          <div className="flex w-full items-center gap-3 md:w-auto md:flex-1">
            {showSearch && <Skeleton className="h-9 w-full max-w-md min-w-[200px] rounded-md" />}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {showFilters && (
              <>
                <Skeleton className="h-9 w-[140px] rounded-md" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </>
            )}
            {showActions && <Skeleton className="h-9 w-24 rounded-md" />}
          </div>
        </div>
      )}
    </div>
  );
}
