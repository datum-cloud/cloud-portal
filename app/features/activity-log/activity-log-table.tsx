import { getActivityLogColumns } from './activity-log-columns';
import { getResourceFilterOptions, getActionFilterOptions } from './activity-log-filters';
import {
  Table,
  TagFilter,
  TimeRangeFilter,
  useDataTableLoading,
  type ServerFetchArgs,
} from '@/components/table';
import { useApp } from '@/providers/app.provider';
import type { ActivityLog, ActivityLogList, ActivityLogScope } from '@/resources/activity-logs';
import {
  buildCELFilter,
  buildCombinedFilter,
} from '@/resources/activity-logs/activity-log.helpers';
import { createActivityLogService } from '@/resources/activity-logs/activity-log.service';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  type TimeRangeValue,
  toApiTimeRange,
  getBrowserTimezone,
} from '@datum-cloud/datum-ui/date-picker';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { RefreshCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================
// HELPERS
// ============================================

/** Maximum characters to surface from an API error message before truncating. */
const MAX_ERROR_MESSAGE_LENGTH = 200;

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
        return msg.length > MAX_ERROR_MESSAGE_LENGTH
          ? msg.slice(0, MAX_ERROR_MESSAGE_LENGTH) + '...'
          : msg;
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

  // Refetch sentinel — bump to force Table.Server to re-run fetchFn.
  const [refetchKey, setRefetchKey] = useState(0);
  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  // Track the last toasted error to avoid duplicate notifications.
  const shownErrorRef = useRef<string | null>(null);
  const handleError = useCallback((error: Error) => {
    const errorMessage = extractErrorMessage(error);
    if (shownErrorRef.current !== errorMessage) {
      shownErrorRef.current = errorMessage;
      toast.error('Activity Log', { description: errorMessage });
    }
  }, []);

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

  // Pin the time range per query so paginated requests reuse the exact same
  // startTime/endTime. Relative periods ("last 7d", etc.) resolve against the
  // current clock, so recomputing on every fetch shifts the range forward and
  // the server rejects the cursor with "cannot use cursor because query
  // parameters changed." The pinned range is refreshed only when the cursor
  // resets (fresh query) or the query identity changes. Bumping refetchKey
  // also drops the pin so the next fetch anchors to a fresh "now".
  const timeRangeRef = useRef<ReturnType<typeof toApiTimeRange> | null>(null);
  const timeRangeKeyRef = useRef<string | null>(null);

  // Reset the pinned range when the caller bumps refetchKey so the next
  // fetch anchors to a fresh "now". Must be useEffect, not useMemo — React
  // may discard+recompute useMemo values at any time (Strict Mode even does
  // this intentionally), making ref mutations inside it non-deterministic.
  useEffect(() => {
    timeRangeKeyRef.current = null;
  }, [refetchKey]);

  const fetchFn = useCallback<(args: ServerFetchArgs) => Promise<ActivityLogList>>(
    async ({ cursor, limit, filters, search }) => {
      const service = createActivityLogService();

      const periodFilter = filters['period'] as TimeRangeValue | undefined;
      const actionsFilter = filters['actions'] as string[] | undefined;
      const resourcesFilter = filters['resources'] as string[] | undefined;

      const queryKey = JSON.stringify({
        period: periodFilter ?? null,
        actions: actionsFilter ?? null,
        resources: resourcesFilter ?? null,
        search: search || '',
      });

      if (!cursor || timeRangeKeyRef.current !== queryKey || !timeRangeRef.current) {
        timeRangeRef.current = toApiTimeRange(periodFilter ?? null, timezone);
        timeRangeKeyRef.current = queryKey;
      }

      const { startTime, endTime } = timeRangeRef.current;

      // defaultResource prop takes precedence over the filter UI value
      const effectiveResources = effectiveDefaultResources ?? resourcesFilter;

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
    },
    [timezone, effectiveDefaultResources, scope]
  );

  return (
    <Table.Server<ActivityLog, ActivityLogList>
      columns={columns}
      limit={defaultPageSize}
      fetchFn={fetchFn}
      transform={(response: ActivityLogList) => ({
        data: response.items,
        cursor: response.nextCursor ?? undefined,
        hasNextPage: response.hasMore,
      })}
      defaultFilters={defaultFilters}
      refetchKey={refetchKey}
      onError={handleError}
      urlSync={!hideFilters}
      search={!hideFilters ? 'Search activity' : undefined}
      filters={
        !hideFilters
          ? [
              <TimeRangeFilter key="period" column="period" disableFuture />,
              <TagFilter
                key="actions"
                column="actions"
                label="Action"
                options={sortedActionOptions}
                className="h-9"
              />,
              ...(!defaultResource
                ? [
                    <TagFilter
                      key="resources"
                      column="resources"
                      label="Resource"
                      options={sortedResourceOptions}
                      className="h-9"
                    />,
                  ]
                : []),
            ]
          : undefined
      }
      actions={
        !hideFilters ? [<ActivityLogRefreshButton key="refresh" onClick={refetch} />] : undefined
      }
      empty="No activity found."
      pagination={hidePagination ? false : 'simple'}
      className={className}
    />
  );
}

/**
 * Refresh button that renders inside `Table.Server`'s `actions` slot. Reads
 * loading state from the wrapper's context via `useDataTableLoading` so the
 * button shows a spinner (and disables) while a fetch is in flight.
 *
 * Must be rendered inside `<Table.Server>`; the `actions` prop slot
 * satisfies that because the toolbar is a child of `DataTable.Server`.
 */
function ActivityLogRefreshButton({ onClick }: { onClick: () => void }) {
  const { isLoading } = useDataTableLoading();
  return (
    <Button
      type="primary"
      theme="solid"
      size="small"
      loading={isLoading}
      onClick={onClick}
      icon={<Icon icon={RefreshCcw} className="size-4" />}
      iconPosition="left">
      <span className="hidden sm:inline">Refresh</span>
    </Button>
  );
}
