import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import {
  ALB_LOGS_DENIED_MESSAGE,
  useAlbLogsPermission,
} from '@/features/edge/proxy/hooks/use-alb-logs-permission';
import { AlbLogsExplorer } from '@/features/edge/proxy/logs/alb-logs-explorer';
import { useAlbLogs } from '@/resources/o11y-logs';
import { AuthorizationError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
  lastThirtyMinutes,
  resolveLogTimeRange,
  type LogFilters,
  type LogTimeRange,
} from '@datum-cloud/datum-ui/logs';
import { useCallback, useState } from 'react';
import { useParams, type MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Logs</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Logs'));

export default function HttpProxyLogsPage() {
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();
  const { hasPermission, isLoading: permLoading } = useAlbLogsPermission();

  const [timeRange, setTimeRange] = useState<LogTimeRange>(() => lastThirtyMinutes());
  const [filters, setFilters] = useState<LogFilters>({});
  const [search, setSearch] = useState('');
  const [live, setLive] = useState(false);

  const handleTimeRangeChange = useCallback((range: LogTimeRange) => {
    setLive(false);
    setTimeRange(range);
  }, []);

  const handleLiveChange = useCallback((next: boolean) => {
    setLive(next);
    if (next) setTimeRange(lastThirtyMinutes());
  }, []);

  const logsQuery = useAlbLogs(projectId, proxyId, {
    timeRange,
    filters,
    search,
    live,
    enabled: hasPermission,
  });

  const denied = !permLoading && (!hasPermission || logsQuery.error instanceof AuthorizationError);
  const errorMessage =
    logsQuery.error && !(logsQuery.error instanceof AuthorizationError)
      ? logsQuery.error.message
      : undefined;

  return (
    <div className="relative flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-xl border">
      {denied && <RestrictedOverlay message={ALB_LOGS_DENIED_MESSAGE} />}
      <AlbLogsExplorer
        entries={logsQuery.data ?? []}
        timeRange={timeRange}
        filters={filters}
        search={search}
        live={live}
        isLoading={permLoading || logsQuery.isLoading}
        error={errorMessage}
        onTimeRangeChange={handleTimeRangeChange}
        onFiltersChange={setFilters}
        onSearchChange={setSearch}
        onLiveChange={handleLiveChange}
        onRefresh={() => {
          // A preset window ("Last 30 minutes") slides to now, which changes the
          // query key and refetches. Live and absolute ranges refetch in place.
          const next = live ? timeRange : resolveLogTimeRange(timeRange);
          if (next === timeRange) {
            void logsQuery.refetch();
            return;
          }
          setTimeRange(next);
        }}
      />
    </div>
  );
}
