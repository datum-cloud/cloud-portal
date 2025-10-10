import { ActivityLogItem } from './list-item';
import { DataTableFilter } from '@/components/data-table';
import { DataTable } from '@/components/data-table/data-table';
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
    data: { logs: ActivityLogEntry[] };
  }>({ key: 'activity-logs' });
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<{ q?: string; date?: DateRange }>();

  // Memoize the query parameters to prevent infinite re-renders
  const queryParams = useMemo(() => {
    let start: string | number = '7d';
    let end: string | number = '';

    // Dates are already in UTC timestamps from the timezone-aware DatePicker
    if (filters?.date) {
      // Convert Date objects to Unix timestamps (seconds)
      start = filters.date.from ? Math.floor(filters.date.from.getTime() / 1000) : start;
      end = filters.date.to ? Math.floor(filters.date.to.getTime() / 1000) : end;
    }

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
  ]);

  // Fetch activity logs when query parameters change
  useEffect(() => {
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
        toast.error(fetcher.data?.message);
      }

      setIsLoading(false);
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
      isLoading={isLoading}
      loadingText="Loading activity..."
      tableCardClassName="px-3 py-2"
      className={className}
      serverSideFiltering
      onFiltersChange={setFilters}
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
          />
        </DataTableFilter>
      }
    />
  );
};
