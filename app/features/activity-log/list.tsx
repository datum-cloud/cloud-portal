import { ActivityLogItem } from './list-item';
import { DataTableFilter } from '@/modules/datum-ui/components/data-table';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import type { ActivityLogEntry, QueryParams } from '@/modules/loki/types';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';

type ActivityQueryParams = Omit<QueryParams, 'start' | 'end'> & {
  start: string | number;
  end: string | number;
};

const activityLogKeys = {
  all: ['activityLogs'] as const,
  list: (params: ActivityQueryParams) => [...activityLogKeys.all, 'list', params] as const,
};

type ActivityLogsResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data: { logs: ActivityLogEntry[] };
};

async function fetchActivityLogs(params: ActivityQueryParams): Promise<ActivityLogsResponse> {
  const stringParams: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      stringParams[key] = String(value);
    }
  });

  const response = await fetch(`/api/activity?${new URLSearchParams(stringParams).toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch activity logs');
  }
  return response.json();
}

export const ActivityLogList = ({
  params,
  title,
  className,
}: {
  params?: QueryParams;
  title?: string;
  className?: string;
}) => {
  const [filters, setFilters] = useState<{ q?: string; date?: DateRange }>({});

  // Calculate default date range (last 7 days) to match the default query
  const defaultDateRange = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      from: sevenDaysAgo,
      to: today,
    };
  }, []);

  // Memoize the query parameters to prevent infinite re-renders
  const queryParams = useMemo(() => {
    let start: string | number = '';
    let end: string | number = '';

    // Use filter dates if available, otherwise use default date range
    if (filters?.date) {
      // Convert Date objects to Unix timestamps (seconds)
      start = filters.date.from ? Math.floor(filters.date.from.getTime() / 1000) : start;
      end = filters.date.to ? Math.floor(filters.date.to.getTime() / 1000) : end;
    } else if (filters !== undefined) {
      // Only use default when filters state is initialized but no date filter exists
      // This prevents using default when URL has date parameter (filters will be undefined initially)
      start = Math.floor(defaultDateRange.from.getTime() / 1000);
      end = Math.floor(defaultDateRange.to.getTime() / 1000);
    }
    // If filters is undefined, skip this render (waiting for URL params to load)

    return {
      start,
      end,
      limit: '1000',
      actions: 'create,update,patch,delete,deletecollection', // Only Write operations
      stage: 'ResponseComplete',
      excludeDryRun: true,
      q: filters?.q,
      ...(params ?? {}),
    };
  }, [
    params?.project,
    params?.user,
    params?.q,
    params?.resource,
    params?.status,
    params?.actions,
    filters?.q,
    filters?.date,
    defaultDateRange,
  ]);

  const {
    data: response,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: activityLogKeys.list(queryParams),
    queryFn: () => fetchActivityLogs(queryParams),
    enabled: !!queryParams.start && !!queryParams.end,
  });

  const logs = response?.success ? (response?.data?.logs ?? []) : [];
  const emptyMessage = response?.success ? response?.message : undefined;

  const columns: ColumnDef<ActivityLogEntry>[] = useMemo(
    () => [
      {
        header: 'Recent events',
        accessorKey: 'auditId',
        enableSorting: false,
        meta: {
          className: 'whitespace-normal',
        },
        cell: ({ row }) => {
          const log = row.original;
          return <ActivityLogItem log={log} index={row.index} />;
        },
      },
    ],
    []
  );

  return (
    <DataTable
      hideHeader
      mode="card"
      columns={columns}
      data={logs}
      emptyContent={{
        title: emptyMessage || `you haven't done anything yet.`,
      }}
      tableTitle={title ? { title } : undefined}
      tableClassName="table-fixed"
      isLoading={isLoading || isFetching}
      loadingText={isFetching && !isLoading ? 'Filtering' : 'Loading'}
      tableCardClassName="px-3 py-2"
      className={className}
      serverSideFiltering
      onFiltersChange={setFilters}
      onFilteringStart={() => {}}
      filterComponent={
        <DataTableFilter>
          <DataTableFilter.Search filterKey="q" placeholder="Search activity..." />
          <DataTableFilter.DatePicker
            filterKey="date"
            placeholder="Filter by time range"
            mode="range"
            excludePresets={['thisYear', 'lastYear']}
            closeOnSelect={false}
            disableFuture
            applyDayBoundaries={true}
            useUserTimezone={true}
            defaultValue={defaultDateRange}
          />
        </DataTableFilter>
      }
    />
  );
};
