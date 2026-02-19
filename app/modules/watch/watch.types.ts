// app/modules/watch/watch.types.ts

export type WatchEventType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK' | 'ERROR';

export interface WatchEvent<T = unknown> {
  type: WatchEventType;
  object: T;
}

export interface WatchOptions {
  resourceType: string;
  /**
   * Organization ID for org-scoped resources (e.g., projects).
   * Used to construct: /apis/resourcemanager.../organizations/{orgId}/control-plane/...
   */
  orgId?: string;
  /**
   * Project ID for project-scoped resources.
   * Used to construct: /apis/resourcemanager.../projects/{projectId}/control-plane/...
   */
  projectId?: string;
  /**
   * K8s namespace (usually 'default' for project resources)
   */
  namespace?: string;
  name?: string;
  resourceVersion?: string;
  timeoutSeconds?: number;
  labelSelector?: string;
  fieldSelector?: string;
}

export interface WatchConnection {
  key: string;
  controller: AbortController;
  subscribers: Set<WatchSubscriber>;
  resourceVersion: string;
  reconnectAttempts: number;
}

export type WatchSubscriber<T = unknown> = (event: WatchEvent<T>) => void;

export interface UseResourceWatchOptions<T> extends WatchOptions {
  queryKey: readonly unknown[];
  enabled?: boolean;
  transform?: (item: unknown) => T;
  onEvent?: (event: WatchEvent<T>) => void;
  /**
   * Minimum interval between list refetches (ms).
   * Prevents rapid-fire refetches from continuous watch events.
   * Use lower values for user-initiated CRUD (e.g., 500ms for DNS records).
   * Use higher values for continuous status updates (e.g., 5000ms for domains).
   * @default 1000
   */
  throttleMs?: number;
  /**
   * Debounce delay for batching multiple watch events (ms).
   * Events within this window are batched into a single invalidation.
   * @default 300
   */
  debounceMs?: number;
  /**
   * Skip ADDED events during initial sync period after watch connects.
   * When true, ADDED events in the first 2s are ignored (cache already hydrated).
   * Set to false for resources where user might create immediately after page load.
   * @default true
   */
  skipInitialSync?: boolean;
  /**
   * Extract unique identifier from a transformed item.
   * When provided, MODIFIED events on list watches update items in-place
   * via setQueryData instead of invalidating (avoids full refetch).
   * @example (item) => item.name
   */
  getItemKey?: (item: T) => string;
  /**
   * Update the list cache with a modified item.
   * Required when the query data structure isn't a plain array (e.g. paginated { items: T[] }).
   * Defaults to array find-and-replace by getItemKey.
   * @example (oldData, newItem) => ({ ...oldData, items: oldData.items.map(...) })
   */
  updateListCache?: (oldData: unknown, newItem: T) => unknown;
  /**
   * Update the single resource cache with a modified item.
   * Allows merging existing data with new data from watch events.
   * Defaults to direct replacement with new item.
   * @example (oldData, newItem) => ({ ...newItem, preservedField: oldData.preservedField })
   */
  updateSingleCache?: (oldData: T | undefined, newItem: T) => T;
}
