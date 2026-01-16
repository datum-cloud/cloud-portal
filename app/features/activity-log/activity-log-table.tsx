import { getActivityLogColumns } from './activity-log-columns';
import { getResourceFilterOptions, getActionFilterOptions } from './activity-log-filters';
import { useActivityLogTable } from './use-activity-log-table';
import {
  DataTable,
  DataTableFilter,
  DataTableToolbarConfig,
} from '@/modules/datum-ui/components/data-table';
import { useApp } from '@/providers/app.provider';
import type { ActivityLogScope } from '@/resources/activity-logs';
import { toast } from '@datum-ui/components';
import { useMemo, useEffect, useRef } from 'react';

// ============================================
// HELPERS
// ============================================

/**
 * Extracts a user-friendly error message from API errors.
 * Handles Kubernetes-style API error responses.
 */
function extractErrorMessage(error: Error): string {
  try {
    // Try to parse the error message as JSON (API errors often include JSON in message)
    const messageMatch = error.message?.match(/\{[\s\S]*\}/);
    if (messageMatch) {
      const parsed = JSON.parse(messageMatch[0]);

      // Kubernetes API error format
      if (parsed.message) {
        // Extract the core message, removing technical details
        const msg = parsed.message;

        // Check for time range error
        if (msg.includes('time range') && msg.includes('exceeds maximum')) {
          return 'Time range exceeds maximum of 30 days. Please select a shorter period.';
        }

        // Return the message, truncated if too long
        return msg.length > 200 ? msg.slice(0, 200) + '...' : msg;
      }
    }
  } catch {
    // JSON parsing failed, use raw message
  }

  return error.message || 'An unexpected error occurred';
}

// ============================================
// TYPES
// ============================================

export interface ActivityLogTableProps {
  /** The scope to query activity logs for */
  scope: ActivityLogScope;
  /** Optional title for the table */
  title?: string;
  /** Optional CSS class name */
  className?: string;
  /**
   * Default page size. Defaults to 20.
   * Use smaller values (e.g., 10) for compact views like dashboards.
   * @default 20
   */
  defaultPageSize?: number;
  /**
   * Whether to hide the pagination controls.
   * Useful for compact/preview views.
   * @default false
   */
  hidePagination?: boolean;
  /**
   * Whether to hide the filter controls.
   * Useful for compact/preview views.
   * @default false
   */
  hideFilters?: boolean;
  /**
   * Default resource filter(s) to apply.
   * When set, the resource filter UI is hidden and only these resources are shown.
   * Useful for resource-specific activity views (e.g., DNS zones page).
   *
   * @example
   * ```tsx
   * // Show only DNS zone activity
   * <ActivityLogTable
   *   scope={{ type: 'project', projectId }}
   *   defaultResource="dnszones"
   * />
   *
   * // Show only domain and DNS record activity
   * <ActivityLogTable
   *   scope={{ type: 'project', projectId }}
   *   defaultResource={['domains', 'dnsrecords']}
   * />
   * ```
   */
  defaultResource?: string | string[];
}

// ============================================
// COMPONENT
// ============================================

/**
 * Activity Log Table component with full server-side support.
 *
 * Features:
 * - Server-side filtering (search, action, resource, date range)
 * - Server-side pagination with cached pages
 * - Scope-aware resource filter options
 * - Humanized action messages
 *
 * @example
 * ```tsx
 * // Project Home - compact view
 * <ActivityLogTable
 *   scope={{ type: 'project', projectId }}
 *   defaultPageSize={10}
 *   hidePagination
 *   hideFilters
 *   title="Recent Activity"
 * />
 *
 * // Project Activity Page - full view
 * <ActivityLogTable
 *   scope={{ type: 'project', projectId }}
 *   defaultPageSize={50}
 * />
 * ```
 */
export function ActivityLogTable({
  scope,
  title,
  className,
  defaultPageSize = 20,
  hidePagination = false,
  hideFilters = false,
  defaultResource,
}: ActivityLogTableProps) {
  const { user, organization } = useApp();

  // All state management delegated to hook
  const table = useActivityLogTable({
    scope,
    defaultPageSize,
    defaultResource,
    hideFilters,
  });

  // Track shown errors to prevent duplicate toasts
  const shownErrorRef = useRef<string | null>(null);

  // Show toast on error
  useEffect(() => {
    if (table.error) {
      // Extract user-friendly message from the error
      const errorMessage = extractErrorMessage(table.error);

      // Only show toast if this is a new error (prevent duplicates)
      if (shownErrorRef.current !== errorMessage) {
        shownErrorRef.current = errorMessage;
        toast.error('Activity Log', {
          description: errorMessage,
        });
      }
    } else {
      // Clear tracked error when error is resolved
      shownErrorRef.current = null;
    }
  }, [table.error]);

  // Columns - hide User column for 'user' scope (it's always the logged-in user)
  const columns = useMemo(() => {
    const currentUser = organization?.type !== 'Personal' ? user : undefined;
    const hideUserColumn = scope.type === 'user';
    return getActivityLogColumns({ user: currentUser, hideUserColumn });
  }, [user, organization, scope.type]);

  // Scope-aware filter options
  const resourceOptions = useMemo(() => getResourceFilterOptions(scope.type), [scope.type]);
  const actionOptions = useMemo(() => getActionFilterOptions(), []);

  // Toolbar configuration
  const toolbarConfig = useMemo<DataTableToolbarConfig>(
    () => ({
      layout: 'compact',
      includeSearch: hideFilters
        ? false
        : {
            placeholder: 'Search activity',
          },
      filtersDisplay: 'auto',
      maxInlineFilters: 1,
      primaryFilters: ['period'],
    }),
    [hideFilters]
  );

  return (
    <DataTable
      columns={columns}
      data={table.data}
      className={className}
      tableTitle={title ? { title } : undefined}
      isLoading={table.isLoading || table.isFetching}
      loadingText={table.isFetching && !table.isLoading ? 'Filtering' : 'Loading'}
      emptyContent={{
        title: 'No activity found',
        subtitle: hideFilters ? undefined : 'Try adjusting your filters.',
      }}
      // Server-side filtering
      serverSideFiltering={!hideFilters}
      onFiltersChange={hideFilters ? undefined : table.setFilters}
      // Server-side pagination
      serverSidePagination={!hidePagination}
      hidePagination={hidePagination}
      hasNextPage={table.hasNextPage}
      hasPrevPage={table.hasPrevPage}
      onPageChange={(newPage) => {
        if (newPage > table.page) table.goToNextPage();
        else if (newPage < table.page) table.goToPrevPage();
      }}
      onPageSizeChange={(size) => table.setPageSize(size)}
      controlledPageIndex={table.page}
      controlledPageSize={table.pageSize}
      disableShowAll
      // Toolbar & filters
      toolbar={toolbarConfig}
      filters={
        hideFilters ? undefined : (
          <>
            {/* TimeRange filter - inline (primaryFilter) */}
            <DataTableFilter.TimeRange filterKey="period" disableFuture className="min-w-[250px]" />

            {/* Action filter - in dropdown */}
            <DataTableFilter.Tag
              filterKey="actions"
              label="Action"
              options={actionOptions.sort((a, b) => a.label.localeCompare(b.label))}
            />
            {/* Resource filter - in dropdown (hidden when defaultResource is set) */}
            {!defaultResource && (
              <DataTableFilter.Tag
                filterKey="resources"
                label="Resource"
                options={resourceOptions.sort((a, b) => a.label.localeCompare(b.label))}
              />
            )}
          </>
        )
      }
    />
  );
}
