import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import {
  ALB_LOGS_DENIED_MESSAGE,
  useAlbLogsPermission,
} from '@/features/edge/proxy/hooks/use-alb-logs-permission';
import { AlbLogsExplorer } from '@/features/edge/proxy/logs/alb-logs-explorer';
import { useAlbLogFacets, useAlbLogs } from '@/resources/o11y-logs';
import { AuthorizationError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import {
  lastThirtyMinutes,
  resolveLogTimeRange,
  useLogsUrlState,
  writeLogsUrlState,
  type LogTimeRange,
  type SetLogsSearchParams,
} from '@datum-cloud/datum-ui/logs';
import { useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams, type MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Logs</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Logs'));

export default function HttpProxyLogsPage() {
  const { projectId = '', proxyId = '' } = useParams<{ projectId: string; proxyId: string }>();
  const { hasPermission, isLoading: permLoading } = useAlbLogsPermission();

  // Time range, filters, search and live live in the query string so a
  // refresh or a shared link reopens the same view. Updates go through the
  // router (so its location stays current) without scrolling to the top; the
  // parent routes skip loader revalidation within the same load balancer.
  const [searchParams, setRouterSearchParams] = useSearchParams();
  const setSearchParams = useCallback<SetLogsSearchParams>(
    (update, options) =>
      setRouterSearchParams(update, {
        replace: options?.replace ?? true,
        preventScrollReset: true,
      }),
    [setRouterSearchParams]
  );
  const logsState = useLogsUrlState({ searchParams, setSearchParams });
  const { filters, search, live } = logsState;

  // The URL holds a preset by key (`range=last-30m`), so Refresh can't move
  // the window by writing it back. Re-anchor it here instead: each refresh
  // slides a preset to now, which changes the query key and the timeline.
  // A refresh only applies to the range it was made for: the hook keeps the
  // same `timeRange` object until a logs param changes, and any change
  // re-resolves a preset to now anyway.
  const [refresh, setRefresh] = useState<{ base: LogTimeRange; at: number } | null>(null);
  const timeRange = useMemo(
    () =>
      refresh?.base === logsState.timeRange && logsState.timeRange.preset
        ? resolveLogTimeRange(logsState.timeRange, new Date(refresh.at))
        : logsState.timeRange,
    [logsState.timeRange, refresh]
  );

  // Picking a range stops live, and turning live on snaps back to the last 30
  // minutes. Each pair is one URL write: two router updates in the same tick
  // would each start from the same params and the second would undo the first.
  const handleTimeRangeChange = useCallback(
    (range: LogTimeRange) =>
      setSearchParams((prev) => writeLogsUrlState(prev, { timeRange: range, live: false })),
    [setSearchParams]
  );

  const handleLiveChange = useCallback(
    (next: boolean) =>
      setSearchParams((prev) =>
        writeLogsUrlState(
          prev,
          next ? { live: true, timeRange: lastThirtyMinutes() } : { live: false }
        )
      ),
    [setSearchParams]
  );

  const logsQuery = useAlbLogs(projectId, proxyId, {
    timeRange,
    filters,
    search,
    live,
    enabled: hasPermission,
  });

  const windowFacets = useAlbLogFacets(projectId, proxyId, {
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
        facets={windowFacets}
        timeRange={timeRange}
        filters={filters}
        search={search}
        live={live}
        isLoading={permLoading || logsQuery.isLoading}
        isFetching={logsQuery.isFetching}
        error={errorMessage}
        onTimeRangeChange={handleTimeRangeChange}
        onFiltersChange={logsState.onFiltersChange}
        onSearchChange={logsState.onSearchChange}
        onLiveChange={handleLiveChange}
        onRefresh={() => {
          // A preset window slides to now, which changes the query key and
          // refetches. Live and absolute ranges refetch in place.
          if (!live && timeRange.preset) {
            setRefresh({ base: logsState.timeRange, at: Date.now() });
            return;
          }
          void logsQuery.refetch();
        }}
      />
    </div>
  );
}
