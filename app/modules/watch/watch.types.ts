// app/modules/watch/watch.types.ts

export type WatchEventType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'BOOKMARK' | 'ERROR';

export interface WatchEvent<T = unknown> {
  type: WatchEventType;
  object: T;
}

export interface WatchOptions {
  resourceType: string;
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
}
