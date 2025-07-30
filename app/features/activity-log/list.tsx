import { ActivityLogItem } from './list-item';
import { DataTable } from '@/components/data-table/data-table';
import type { ActivityLogEntry, QueryParams } from '@/modules/loki/types';
import { ROUTE_PATH as ACTIVITY_LOGS_ROUTE_PATH } from '@/routes/api+/activity-logs';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useEffect, useState } from 'react';
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

  // Memoize the query parameters to prevent infinite re-renders
  const queryParams = useMemo(
    () => ({
      start: '7d',
      limit: '1000',
      // Only Write operations
      actions: 'create,update,patch,delete,deletecollection',
      stage: 'ResponseComplete',
      excludeDryRun: true,
      ...(params ?? {}),
    }),
    [params?.project, params?.user, params?.q, params?.resource, params?.status, params?.actions]
  );

  // Fetch activity logs when query parameters change
  useEffect(() => {
    // Convert QueryParams to string record for URLSearchParams
    const stringParams: Record<string, string> = {};
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        stringParams[key] = String(value);
      }
    });

    fetcher.load(`${ACTIVITY_LOGS_ROUTE_PATH}?${new URLSearchParams(stringParams).toString()}`);
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
    />
  );
};
