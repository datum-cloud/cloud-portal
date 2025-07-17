import { ActivityLogItem } from './list-item';
import { DataTable } from '@/components/data-table/data-table';
import type { ActivityLogEntry } from '@/modules/loki/types';
import { ROUTE_PATH as ACTIVITY_LOGS_ROUTE_PATH } from '@/routes/api+/activity-logs';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo, useEffect, useState } from 'react';
import { useFetcher, useParams } from 'react-router';
import { toast } from 'sonner';

export const ActivityLogList = () => {
  const fetcher = useFetcher<{
    success: boolean;
    message?: string;
    data: { logs: ActivityLogEntry[] };
  }>({ key: 'activity-logs' });
  const params = useParams();

  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch activity logs on component mount
  useEffect(() => {
    if (params.projectId) {
      const searchParams = new URLSearchParams({
        project: params.projectId,
        start: '7d',
        limit: '100',
      });

      fetcher.load(`${ACTIVITY_LOGS_ROUTE_PATH}?${searchParams.toString()}`);
    }
  }, [params.projectId]);

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
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6">
      <DataTable
        hideHeader
        mode="card"
        columns={columns}
        data={logs}
        emptyContent={{
          title: 'No activity logs found.',
        }}
        tableTitle={{
          title: 'Activity Logs',
        }}
        tableClassName="table-fixed"
        isLoading={isLoading}
        loadingText="Loading activity logs..."
        tableCardClassName="px-3 py-2"
      />
    </div>
  );
};
