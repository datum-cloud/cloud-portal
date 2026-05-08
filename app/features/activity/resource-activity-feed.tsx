import { defaultErrorFormatter } from './error-formatter';
import type { ActivityResourceKind } from './kinds';
import {
  ActivityFeed,
  type ActivityApiClient,
  type ActivityFeedProps,
  type ResourceLinkResolver,
  parseActivityFilters,
  parseTimeRange,
  serializeActivityFilters,
} from '@datum-cloud/activity-ui';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export interface ResourceActivityFeedProps {
  /** Activity API client — typically obtained from `useProjectActivityClient` / `useOrgActivityClient` / `useUserActivityClient`. */
  client: ActivityApiClient;
  /** Resolves activity resource references to portal routes. Bundled with `client` from the same scope hook. */
  resourceLinkResolver: ResourceLinkResolver;
  /**
   * Lock the feed to one or more resource kinds. When set, the kind filter
   * is hidden from the UI and the listed kinds become non-toggleable.
   */
  resourceKinds?: ActivityResourceKind[];
  /**
   * Lock the feed to a single resource name. When set, the resource-name
   * filter is hidden from the UI.
   */
  resourceName?: string;
  /** Page size for the feed. Defaults to 30. */
  pageSize?: number;
  /** Enable SSE-based live streaming of new activity. Defaults to false (manual refresh). */
  enableStreaming?: boolean;
  /**
   * Compact rendering. Defaults to true. Compact mode also picks the
   * `'timeline'` variant and disables URL sync — appropriate for tab panels
   * embedded inside resource detail pages.
   */
  compact?: boolean;
  /**
   * Override the rendered variant. Defaults: `'timeline'` when `compact`,
   * `'feed'` otherwise.
   */
  variant?: 'feed' | 'timeline';
  /**
   * Sync user-applied filter and time-range state to URL search params.
   * Defaults to `true`. Locked filters (`resourceKinds`, `resourceName`)
   * are NEVER written to the URL — those stay implicit in the route path.
   * Pass `urlSync={false}` to opt out.
   */
  urlSync?: boolean;
  /**
   * Escape hatch: pass arbitrary `<ActivityFeed>` props through. Applied last
   * so they override defaults. Note: `feedProps.hiddenFilters` (and any other
   * key set here) wins over the wrapper's derived value — e.g. passing
   * `feedProps={{ hiddenFilters: [] }}` re-exposes a filter that the wrapper
   * had locked based on `resourceKinds`/`resourceName`.
   */
  feedProps?: Partial<ActivityFeedProps>;
}

/**
 * Cloud-portal wrapper around `<ActivityFeed>` from `@datum-cloud/activity-ui`.
 *
 * Centralizes the per-route configuration that we'd otherwise repeat at every
 * activity surface: the cloud-portal error formatter, URL <-> filter sync,
 * locked filters that match the surrounding context (e.g. a service-account
 * activity tab locks `resourceKinds=['ServiceAccount', 'ServiceAccountKey']`),
 * and the timeline-vs-feed variant selection for compact tab panels vs.
 * full-page activity views.
 *
 * The three scope hooks (`useProjectActivityClient`, `useOrgActivityClient`,
 * `useUserActivityClient`) supply the `client` and `resourceLinkResolver`
 * props; the consuming route just picks which scope it lives in.
 */
export function ResourceActivityFeed({
  client,
  resourceLinkResolver,
  resourceKinds,
  resourceName,
  pageSize = 30,
  enableStreaming = false,
  compact = true,
  variant,
  urlSync,
  feedProps,
}: ResourceActivityFeedProps) {
  const effectiveVariant = variant ?? (compact ? 'timeline' : 'feed');
  const effectiveUrlSync = urlSync ?? true;

  const [searchParams, setSearchParams] = useSearchParams();

  // URL provides the unlocked filter slice (actor, time range, search,
  // changeSource) on mount. Route-locked props win on top so a stale or
  // mismatched URL can't override what the route's path already implies.
  const initialFilters = useMemo(() => {
    const fromUrl = effectiveUrlSync ? parseActivityFilters(searchParams) : {};
    return {
      changeSource: 'all' as const,
      ...fromUrl,
      ...(resourceKinds ? { resourceKinds } : {}),
      ...(resourceName ? { resourceName } : {}),
    };
  }, []);

  const initialTimeRange = useMemo(() => {
    if (!effectiveUrlSync) return undefined;
    return parseTimeRange(searchParams);
  }, []);

  const hiddenFilters = useMemo(() => {
    const hidden: Array<'resourceKinds' | 'resourceName'> = [];
    if (resourceKinds) hidden.push('resourceKinds');
    if (resourceName) hidden.push('resourceName');
    return hidden.length > 0 ? hidden : undefined;
  }, [resourceKinds, resourceName]);

  const handleFiltersChange = useCallback(
    (
      filters: Parameters<NonNullable<ActivityFeedProps['onFiltersChange']>>[0],
      timeRange: Parameters<NonNullable<ActivityFeedProps['onFiltersChange']>>[1]
    ) => {
      if (!effectiveUrlSync) return;
      // Strip route-locked keys before serializing — they're already implicit
      // in the route path, so writing them to ?resourceKinds=...&resourceName=...
      // would just be redundant noise that confuses anyone reading the URL.
      const { resourceKinds: _rk, resourceName: _rn, ...freeFilters } = filters;
      const next = serializeActivityFilters(freeFilters, timeRange);
      setSearchParams(next, { replace: true });
    },
    [effectiveUrlSync, setSearchParams]
  );

  return (
    <ActivityFeed
      client={client}
      resourceLinkResolver={resourceLinkResolver}
      compact={compact}
      variant={effectiveVariant}
      pageSize={pageSize}
      enableStreaming={enableStreaming}
      tenantRenderer={() => null}
      errorFormatter={defaultErrorFormatter}
      initialFilters={initialFilters}
      initialTimeRange={initialTimeRange}
      hiddenFilters={hiddenFilters}
      onFiltersChange={effectiveUrlSync ? handleFiltersChange : undefined}
      {...feedProps}
    />
  );
}
