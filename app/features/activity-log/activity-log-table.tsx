import { getActivityLogColumns } from './activity-log-columns';
import { getResourceFilterOptions, getActionFilterOptions } from './activity-log-filters';
import {
  DataTable,
  DataTablePanel,
  DataTableToolbar,
  TagFilter,
  TimeRangeFilter,
  useNuqsAdapter,
} from '@/components/data-table';
import { cn } from '@shadcn/lib/utils';
import { useApp } from '@/providers/app.provider';
import type { ActivityLogScope } from '@/resources/activity-logs';
import {
  buildCELFilter,
  buildCombinedFilter,
} from '@/resources/activity-logs/activity-log.helpers';
import { createActivityLogService } from '@/resources/activity-logs/activity-log.service';
import { Button } from '@datum-cloud/datum-ui/button';
import { useDataTableFilters, useDataTableLoading } from '@datum-cloud/datum-ui/data-table';
import {
  type TimeRangeValue,
  toApiTimeRange,
  getBrowserTimezone,
} from '@datum-cloud/datum-ui/date-picker';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { RefreshCcw } from 'lucide-react';
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
    const messageMatch = error.message?.match(/\{[\s\S]*\}/);
    if (messageMatch) {
      const parsed = JSON.parse(messageMatch[0]);
      if (parsed.message) {
        const msg = parsed.message;
        if (msg.includes('time range') && msg.includes('exceeds maximum')) {
          return 'Time range exceeds maximum of 30 days. Please select a shorter period.';
        }
        return msg.length > 200 ? msg.slice(0, 200) + '...' : msg;
      }
    }
  } catch {
    // JSON parsing failed, use raw message
  }
  return error.message || 'An unexpected error occurred';
}

// ============================================
// INNER COMPONENTS
// ============================================

/**
 * Renders the refresh button inside the DataTable.Server context so it can
 * trigger a re-fetch by bumping a sentinel filter value.
 */
function ActivityLogRefreshButton() {
  const { setFilter } = useDataTableFilters();
  const { isLoading } = useDataTableLoading();

  return (
    <Button
      type="primary"
      theme="solid"
      size="small"
      onClick={() => setFilter('_refresh', Date.now())}
      icon={<Icon icon={RefreshCcw} className="size-4" />}
      iconPosition="left"
      loading={isLoading}>
      <span className="hidden sm:inline">Refresh</span>
    </Button>
  );
}

/**
 * Reads error state from the DataTable.Server context and shows a toast.
 */
function ActivityLogErrorHandler() {
  const { error } = useDataTableLoading();
  const shownErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (error) {
      const errorMessage = extractErrorMessage(error);
      if (shownErrorRef.current !== errorMessage) {
        shownErrorRef.current = errorMessage;
        toast.error('Activity Log', {
          description: errorMessage,
        });
      }
    } else {
      shownErrorRef.current = null;
    }
  }, [error]);

  return null;
}

// ============================================
// TYPES
// ============================================

export interface ActivityLogTableProps {
  /** The scope to query activity logs for */
  scope: ActivityLogScope;
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
   */
  defaultResource?: string | string[];
  /**
   * Initial action filter(s) for the filter UI.
   * Sets a default action filter that users can change.
   */
  initialActions?: string | string[];
}

// ============================================
// COMPONENT
// ============================================

/**
 * Activity Log Table component with full server-side support.
 *
 * Features:
 * - Server-side filtering (search, action, resource, date range)
 * - Server-side cursor pagination
 * - Scope-aware resource filter options
 * - Humanized action messages
 */
export function ActivityLogTable({
  scope,
  className,
  defaultPageSize = 20,
  hidePagination = false,
  hideFilters = false,
  defaultResource,
  initialActions,
}: ActivityLogTableProps) {
  const { user, organization, userPreferences } = useApp();

  // Timezone for time range conversion
  const timezone = userPreferences?.timezone ?? getBrowserTimezone();

  // Columns — hide User column for 'user' scope
  const columns = useMemo(() => {
    const currentUser = organization?.type !== 'Personal' ? user : undefined;
    const hideUserColumn = scope.type === 'user';
    return getActivityLogColumns({ user: currentUser, hideUserColumn });
  }, [user, organization, scope.type]);

  // Scope-aware filter options
  const resourceOptions = useMemo(() => getResourceFilterOptions(scope.type), [scope.type]);
  const actionOptions = useMemo(() => getActionFilterOptions(), []);

  const sortedActionOptions = useMemo(
    () => [...actionOptions].sort((a, b) => a.label.localeCompare(b.label)),
    [actionOptions]
  );
  const sortedResourceOptions = useMemo(
    () => [...resourceOptions].sort((a, b) => a.label.localeCompare(b.label)),
    [resourceOptions]
  );

  // Normalize defaultResource to array for use inside fetchFn closure
  const effectiveDefaultResources = useMemo<string[] | undefined>(() => {
    if (!defaultResource) return undefined;
    return Array.isArray(defaultResource) ? defaultResource : [defaultResource];
  }, [defaultResource]);

  // Pre-populate action filter when initialActions is provided
  const defaultFilters = useMemo(() => {
    if (!initialActions) return undefined;
    const actionsArray = Array.isArray(initialActions) ? initialActions : [initialActions];
    return { actions: actionsArray };
  }, [initialActions]);

  // State adapter — syncs sort/search/pagination/filters to URL
  const stateAdapter = useNuqsAdapter();

  return (
    <DataTable.Server
      columns={columns}
      limit={defaultPageSize}
      fetchFn={async ({ cursor, limit, filters, search }) => {
        const service = createActivityLogService();

        // Extract time range from filters and convert to API startTime/endTime
        const periodFilter = filters['period'] as TimeRangeValue | undefined;
        const { startTime, endTime } = toApiTimeRange(periodFilter ?? null, timezone);

        // Extract array filters
        const actionsFilter = filters['actions'] as string[] | undefined;
        const resourcesFilter = filters['resources'] as string[] | undefined;

        // defaultResource prop takes precedence over the filter UI value
        const effectiveResources = effectiveDefaultResources ?? resourcesFilter;

        // Build CEL filter from UI filter params
        const celFilter = buildCELFilter({
          search: search || undefined,
          actions: actionsFilter,
          resources: effectiveResources,
          scopeType: scope.type,
        });

        const combinedFilter = buildCombinedFilter(celFilter);

        return service.query({
          scope,
          startTime,
          endTime,
          filter: combinedFilter,
          limit,
          continue: cursor,
        });
      }}
      transform={(response) => ({
        data: response.items,
        cursor: response.nextCursor ?? undefined,
        hasNextPage: response.hasMore,
      })}
      stateAdapter={hideFilters ? undefined : stateAdapter}
      defaultFilters={defaultFilters}
      className={cn('space-y-4', className)}>
      {/* Error toast handler — must live inside DataTable.Server context */}
      <ActivityLogErrorHandler />

      {!hideFilters && (
        <DataTableToolbar
          search={{ placeholder: 'Search activity' }}
          filters={[
            <TimeRangeFilter key="period" column="period" disableFuture />,
            <TagFilter
              key="actions"
              column="actions"
              label="Action"
              options={sortedActionOptions}
            />,
            ...(!defaultResource
              ? [
                  <TagFilter
                    key="resources"
                    column="resources"
                    label="Resource"
                    options={sortedResourceOptions}
                  />,
                ]
              : []),
          ]}
          actions={[<ActivityLogRefreshButton key="refresh" />]}
        />
      )}

      <DataTablePanel>
        <DataTable.Content emptyMessage="No activity found." />
        {!hidePagination && <DataTable.Pagination />}
      </DataTablePanel>
    </DataTable.Server>
  );
}
