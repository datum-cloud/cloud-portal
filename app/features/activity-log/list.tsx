import { ActivityLogItem } from './list-item';
import { DataTableFilter } from '@/modules/datum-ui/components/data-table';
import { DataTable } from '@/modules/datum-ui/components/data-table/data-table';
import type { ActivityLogEntry, QueryParams } from '@/modules/loki/types';
import { ROUTE_PATH as ACTIVITY_ROUTE_PATH } from '@/routes/api/activity';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';

export const ActivityLogList = ({
  params,
  title,
  className,
}: {
  params?: QueryParams;
  title?: string;
  className?: string;
}) => {
  const fetcher = useFetcher<{
    success: boolean;
    message?: string;
    error?: string;
    data: { logs: ActivityLogEntry[] };
  }>({ key: 'activity-logs' });
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
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

  // Fetch activity logs when query parameters change
  useEffect(() => {
    // Don't fetch if we don't have start/end dates (waiting for URL params or default)
    if (!queryParams.start || !queryParams.end) {
      return;
    }

    // Convert QueryParams to string record for URLSearchParams
    const stringParams: Record<string, string> = {};
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        stringParams[key] = String(value);
      }
    });

    fetcher.load(`${ACTIVITY_ROUTE_PATH}?${new URLSearchParams(stringParams).toString()}`);
  }, [queryParams]);

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

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data?.success) {
        setLogs(fetcher.data?.data?.logs ?? []);
      } else {
        toast.error(fetcher.data?.error);
      }

      setIsLoading(false);
      setIsFiltering(false); // End filtering when data is loaded
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <DataTable
      hideHeader
      mode="card"
      columns={columns}
      data={logs}
      emptyContent={{
        title: 'No activity found.',
      }}
      tableTitle={title ? { title } : undefined}
      tableClassName="table-fixed"
      isLoading={isLoading || isFiltering}
      loadingText={isFiltering ? 'Filtering activity...' : 'Loading activity...'}
      tableCardClassName="px-3 py-2"
      className={className}
      serverSideFiltering
      onFiltersChange={setFilters}
      onFilteringStart={() => setIsFiltering(true)}
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
