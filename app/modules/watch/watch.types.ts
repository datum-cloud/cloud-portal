// app/modules/watch/watch.types.ts
import type { CacheItemMeta } from './resource-cache';
import type { QueryKey } from '@tanstack/react-query';

/** `RESYNC` is synthetic: events may have been missed, so the cache refetches. */
export type WatchEventType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK' | 'ERROR' | 'RESYNC';

export type ResyncReason =
  | 'reconnect'
  | 'visible'
  | 'online'
  | 'joined'
  | 'expired'
  | 'degraded'
  | 'recovered'
  | 'auth'
  | 'error';

export interface ResyncPayload {
  reason: ResyncReason;
  degraded?: boolean;
}

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
   * K8s namespace (usually `'default'` for project resources).
   * Omit for cluster-scoped resources in a project control plane (e.g. Location).
   */
  namespace?: string;
  name?: string;
  resourceVersion?: string;
  timeoutSeconds?: number;
  labelSelector?: string;
  fieldSelector?: string;
  /**
   * If true, watches a user-scoped resource (e.g., UserInvitation) across all namespaces.
   * The server resolves the user from the authenticated session — do not pass a userId.
   */
  userScoped?: boolean;
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
   * Extract unique identifier from a transformed item.
   * ADDED list events append/replace by this key. MODIFIED list events
   * update in-place via updateListCache or find-and-replace.
   * @example (item) => item.name
   */
  getItemKey?: (item: T) => string;
  /** Defaults to `getItemKey` for the name and `metadata.*` or top-level fields for the rest. */
  getMeta?: (item: T) => CacheItemMeta;
  /**
   * Update the list cache with a MODIFIED item (find-and-replace).
   * Only for shapes other than arrays and `{ items }`; not used for ADDED or terminating items.
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
  /** List events for items this returns false for are dropped, so they never reach the list. */
  accepts?: (item: T) => boolean;
  /**
   * When false, watch events are forwarded to `onEvent` only — the hook does
   * not write the query cache. Use when cache items are a different shape
   * than the watched object (e.g. flattened DNS rows vs DNSRecordSet).
   * @default true
   */
  applyCacheUpdates?: boolean;
  /** Queries `onEvent` writes into (e.g. cross-org billing lists); resynced with `queryKey`. */
  getMirroredKeys?: () => readonly QueryKey[];
  /** With `syncScope`, rows changed elsewhere flash and deleted rows fade out. Lists only. */
  syncKind?: string;
  syncScope?: string;
}
