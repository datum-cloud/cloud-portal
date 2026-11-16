import { albLogFacets, filterAlbLogsByHost } from '@/resources/o11y-logs';
import {
  Logs,
  type LogColumnId,
  type LogEntry,
  type LogFacet,
  type LogFilters,
  type LogTimeRange,
} from '@datum-cloud/datum-ui/logs';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useMemo, type ReactNode } from 'react';

/** Access-log layout: Time / Status hug, Host is fixed, Path fills. */
const EXPLORER_COLUMNS: readonly LogColumnId[] = ['time', 'status', 'host', 'path'];

export interface AlbLogsExplorerProps {
  entries: readonly LogEntry[];
  /**
   * Facet options for the whole window (see `useAlbLogFacets`). While they
   * load, or if they fail, facets are built from `entries` instead.
   */
  facets?: LogFacet[] | null;
  timeRange: LogTimeRange;
  filters: LogFilters;
  search: string;
  live: boolean;
  isLoading?: boolean;
  /** A request is in flight while earlier results are still showing. */
  isFetching?: boolean;
  error?: ReactNode;
  onTimeRangeChange: (range: LogTimeRange) => void;
  onFiltersChange: (filters: LogFilters) => void;
  onSearchChange: (search: string) => void;
  onLiveChange: (live: boolean) => void;
  onRefresh?: () => void;
  className?: string;
}

/**
 * ALB-scoped log explorer. Facets omit `route_name` because the query is
 * already locked to this load balancer. Host is filtered client-side since it
 * is derived from several Envoy attributes rather than a single stream label.
 */
export function AlbLogsExplorer({
  entries,
  facets: windowFacets,
  timeRange,
  filters,
  search,
  live,
  isLoading,
  isFetching,
  error,
  onTimeRangeChange,
  onFiltersChange,
  onSearchChange,
  onLiveChange,
  onRefresh,
  className,
}: AlbLogsExplorerProps) {
  const visibleEntries = useMemo(() => filterAlbLogsByHost(entries, filters), [entries, filters]);
  const facets = useMemo(() => windowFacets ?? albLogFacets(entries), [windowFacets, entries]);

  return (
    <Logs.Root
      entries={visibleEntries}
      facets={facets}
      timeRange={timeRange}
      filters={filters}
      search={search}
      live={live}
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onTimeRangeChange={onTimeRangeChange}
      onFiltersChange={onFiltersChange}
      onSearchChange={onSearchChange}
      onLiveChange={onLiveChange}
      onRefresh={onRefresh}
      columns={EXPLORER_COLUMNS}
      className={cn('bg-card min-h-0 flex-1', className)}>
      <Logs.Explorer className="bg-card **:data-[slot=logs-filters]:bg-card min-h-0 flex-1" />
    </Logs.Root>
  );
}
