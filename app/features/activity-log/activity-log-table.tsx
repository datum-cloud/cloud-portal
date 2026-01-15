import { getActivityLogColumns } from './activity-log-columns';
import { getResourceFilterOptions, getActionFilterOptions } from './activity-log-filters';
import {
  DataTable,
  DataTableFilter,
  DataTableToolbarConfig,
} from '@/modules/datum-ui/components/data-table';
import { useApp } from '@/providers/app.provider';
import { useActivityLogs, type ActivityLogScope } from '@/resources/activity-logs';
import { subDays } from 'date-fns';
import { useMemo, useState, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';

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
  // Normalize defaultResource to array
  const defaultResourceArray = useMemo(
    () =>
      defaultResource
        ? Array.isArray(defaultResource)
          ? defaultResource
          : [defaultResource]
        : undefined,
    [defaultResource]
  );

  // Filter state managed by DataTable
  const [filters, setFilters] = useState<{
    q?: string;
    actions?: string[];
    resources?: string[];
    date?: DateRange;
  }>({});

  // Pagination state
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Calculate default date range (last 24 hours) for DatePicker display
  const defaultDateRange = useMemo(() => {
    const now = new Date();
    return { from: subDays(now, 1), to: now };
  }, []);

  // Convert date range to API format (RFC3339)
  // Use "now" for end time if it's today or in the future (API rejects future times)
  const timeRange = useMemo(() => {
    if (filters.date?.from && filters.date?.to) {
      const now = new Date();
      const endTime = filters.date.to >= now ? 'now' : filters.date.to.toISOString();

      return {
        startTime: filters.date.from.toISOString(),
        endTime,
      };
    }
    // Default: last 24 hours using relative time
    return {
      startTime: 'now-24h',
      endTime: 'now',
    };
  }, [filters.date]);

  // Query activity logs
  const {
    data,
    isLoading,
    isFetching,
    page,
    hasNextPage,
    hasPrevPage,
    goToNextPage,
    goToPrevPage,
    resetPagination,
  } = useActivityLogs(scope, {
    filters: {
      search: filters.q,
      actions: filters.actions,
      // Use defaultResource if set, otherwise use user-selected filter
      resources: defaultResourceArray ?? filters.resources,
    },
    startTime: timeRange.startTime,
    endTime: timeRange.endTime,
    pageSize,
  });

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [filters.q, filters.actions, filters.resources, filters.date, resetPagination]);

  // Get columns
  const columns = useMemo(() => {
    const currentUser = organization?.type !== 'Personal' ? user : undefined;
    return getActivityLogColumns(currentUser);
  }, [user, organization]);

  // Get scope-aware filter options
  const resourceOptions = useMemo(() => getResourceFilterOptions(scope.type), [scope.type]);
  const actionOptions = useMemo(() => getActionFilterOptions(), []);
  const toolbarConfig = useMemo(() => {
    return {
      layout: 'compact',
      includeSearch: hideFilters
        ? false
        : {
            placeholder: 'Search activity',
          },
      filtersDisplay: 'dropdown',
    } as DataTableToolbarConfig;
  }, [hideFilters]);

  return (
    <DataTable
      columns={columns}
      data={data}
      className={className}
      tableTitle={title ? { title } : undefined}
      isLoading={isLoading || isFetching}
      loadingText={isFetching && !isLoading ? 'Filtering' : 'Loading'}
      emptyContent={{
        title: 'No activity found',
        subtitle: hideFilters ? undefined : 'Try adjusting your filters.',
      }}
      // Server-side filtering
      serverSideFiltering={!hideFilters}
      onFiltersChange={hideFilters ? undefined : setFilters}
      // Server-side pagination
      serverSidePagination={!hidePagination}
      hidePagination={hidePagination}
      hasNextPage={hasNextPage}
      hasPrevPage={hasPrevPage}
      onPageChange={(newPage) => {
        if (newPage > page) goToNextPage();
        else if (newPage < page) goToPrevPage();
      }}
      onPageSizeChange={(size) => {
        setPageSize(size);
        resetPagination();
      }}
      controlledPageIndex={page}
      controlledPageSize={pageSize}
      disableShowAll
      // Filter components
      toolbar={toolbarConfig}
      filters={
        hideFilters ? undefined : (
          <div className="divide-stepper-line flex flex-col divide-y">
            <DataTableFilter.Tag
              filterKey="actions"
              label="Action"
              options={actionOptions.sort((a, b) => a.label.localeCompare(b.label))}
              className="pb-5"
            />
            {/* Hide resource filter when defaultResource is set */}
            {!defaultResource && (
              <DataTableFilter.Tag
                filterKey="resources"
                label="Resource"
                options={resourceOptions.sort((a, b) => a.label.localeCompare(b.label))}
                className="py-5"
              />
            )}
            <DataTableFilter.DatePicker
              filterKey="date"
              label="Time range"
              placeholder="Select time range"
              mode="range"
              maxRange={30}
              disableFuture
              defaultValue={defaultDateRange}
              className="pt-5"
            />
          </div>
        )
      }
    />
  );
}
