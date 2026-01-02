// app/modules/watch/watch.manager.ts
import { parseWatchEvent, extractResourceVersion } from './watch.parser';
import type { WatchConnection, WatchOptions, WatchSubscriber, WatchEvent } from './watch.types';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;

// Delay before actually cleaning up a connection (handles React Strict Mode re-mounts)
const CLEANUP_DELAY_MS = 100;

// Extended connection type to store options for reconnection
interface ManagedConnection extends WatchConnection {
  options: WatchOptions;
  lastActivity: number;
  isConnecting: boolean;
  cleanupTimeout?: ReturnType<typeof setTimeout>;
}

/**
 * WatchManager handles K8s Watch API connections with:
 * - Connection pooling (shared connections for same resource)
 * - Automatic reconnection with exponential backoff
 * - resourceVersion tracking for gap-free updates
 * - Subscriber pattern for broadcasting events
 * - Visibility change handling (reconnect when tab becomes visible)
 * - Delayed cleanup to handle React Strict Mode re-mounts
 */
class WatchManager {
  private connections = new Map<string, ManagedConnection>();
  private visibilityListenerAttached = false;

  /**
   * Build a unique key for a watch connection.
   */
  private buildKey(options: WatchOptions): string {
    const { resourceType, projectId, namespace, name, labelSelector, fieldSelector } = options;
    return [resourceType, projectId, namespace, name, labelSelector, fieldSelector]
      .filter(Boolean)
      .join(':');
  }

  /**
   * Subscribe to watch events for a resource.
   * Returns an unsubscribe function.
   */
  subscribe<T = unknown>(options: WatchOptions, callback: WatchSubscriber<T>): () => void {
    // Attach visibility listener on first subscription (client-side only)
    this.attachVisibilityListener();

    const key = this.buildKey(options);
    const existing = this.connections.get(key);

    if (existing) {
      // Cancel any pending cleanup (React Strict Mode re-mount)
      if (existing.cleanupTimeout) {
        clearTimeout(existing.cleanupTimeout);
        existing.cleanupTimeout = undefined;
      }
      existing.subscribers.add(callback as WatchSubscriber);
      return () => this.unsubscribe(key, callback as WatchSubscriber);
    }

    const connection: ManagedConnection = {
      key,
      controller: new AbortController(),
      subscribers: new Set([callback as WatchSubscriber]),
      resourceVersion: options.resourceVersion || '0',
      reconnectAttempts: 0,
      options,
      lastActivity: Date.now(),
      isConnecting: false,
    };

    this.connections.set(key, connection);
    this.startWatch(options, connection);

    return () => this.unsubscribe(key, callback as WatchSubscriber);
  }

  /**
   * Attach visibility change listener to reconnect stale connections
   * when user returns to the tab.
   */
  private attachVisibilityListener(): void {
    if (this.visibilityListenerAttached || typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handleVisibilityChange();
      }
    });

    this.visibilityListenerAttached = true;
  }

  /**
   * Handle tab becoming visible - check and reconnect stale connections.
   * Also force reconnect all connections to ensure fresh state.
   */
  private handleVisibilityChange(): void {
    const now = Date.now();
    const STALE_THRESHOLD = 60 * 1000; // 1 minute without activity = stale

    this.connections.forEach((connection) => {
      const timeSinceActivity = now - connection.lastActivity;

      // If connection is stale and not currently connecting, reconnect
      if (timeSinceActivity > STALE_THRESHOLD && !connection.isConnecting) {
        connection.controller.abort();
        connection.controller = new AbortController();
        connection.reconnectAttempts = 0;
        this.startWatch(connection.options, connection);
      }
    });
  }

  /**
   * Unsubscribe from watch events.
   * Uses delayed cleanup to handle React Strict Mode re-mounts.
   */
  private unsubscribe(key: string, callback: WatchSubscriber): void {
    const connection = this.connections.get(key);
    if (!connection) return;

    connection.subscribers.delete(callback);

    if (connection.subscribers.size === 0) {
      // Delay cleanup to allow re-subscription (React Strict Mode)
      connection.cleanupTimeout = setTimeout(() => {
        // Double-check no new subscribers were added
        if (connection.subscribers.size === 0) {
          connection.controller.abort();
          this.connections.delete(key);
        }
      }, CLEANUP_DELAY_MS);
    }
  }

  /**
   * Build the URL for K8s Watch API.
   *
   * URL patterns:
   * - Project-scoped: /api/proxy/apis/resourcemanager.miloapis.com/v1alpha1/projects/{projectId}/control-plane/{apiPath}/namespaces/{namespace}/{resourceName}
   * - Cluster-scoped: /api/proxy/{resourceType}/{name}
   *
   * resourceType format: 'apis/dns.networking.miloapis.com/v1alpha1/dnszones' or 'api/v1/secrets'
   * The namespace is inserted between the API path and the resource name.
   *
   * For single resource watches:
   * - Namespaced resources: use fieldSelector (requires list permission on namespace)
   * - Cluster-scoped resources: use path-based access (user has access to specific resource)
   */
  private buildUrl(options: WatchOptions, connection: WatchConnection): string {
    const { resourceType, projectId, namespace, name } = options;

    let url: string;
    // Track if this is a cluster-scoped resource (no namespace, no projectId)
    const isClusterScoped = !projectId && !namespace;

    if (projectId) {
      // Project-scoped control plane resources
      // resourceType: 'apis/dns.networking.miloapis.com/v1alpha1/dnszones'
      // Result: /api/proxy/apis/resourcemanager.miloapis.com/v1alpha1/projects/{projectId}/control-plane/apis/dns.networking.miloapis.com/v1alpha1/namespaces/default/dnszones
      const parts = resourceType.split('/');
      const resourceName = parts.pop(); // 'dnszones'
      const apiPath = parts.join('/'); // 'apis/dns.networking.miloapis.com/v1alpha1'

      url = `/api/proxy/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectId}/control-plane/${apiPath}/namespaces/${namespace}/${resourceName}`;
    } else if (namespace) {
      // Namespaced resources without project scope
      const parts = resourceType.split('/');
      const resourceName = parts.pop();
      const apiPath = parts.join('/');

      url = `/api/proxy/${apiPath}/namespaces/${namespace}/${resourceName}`;
    } else {
      // Cluster-scoped resources
      url = `/api/proxy/${resourceType}`;
    }

    // For cluster-scoped resources, append name to path (user has direct access)
    // For namespaced resources, we'll use fieldSelector (requires list permission)
    if (isClusterScoped && name) {
      url += `/${name}`;
    }

    // Build query params
    const params = new URLSearchParams({
      watch: 'true',
      resourceVersion: connection.resourceVersion,
      timeoutSeconds: String(options.timeoutSeconds || 300),
    });

    if (options.labelSelector) {
      params.set('labelSelector', options.labelSelector);
    }

    // For single resource watches on namespaced resources, use fieldSelector
    // This is the K8s-recommended pattern that keeps the connection open properly
    // (Cluster-scoped resources use path-based access instead - see above)
    if (name && !isClusterScoped) {
      const existingFieldSelector = options.fieldSelector;
      const nameSelector = `metadata.name=${name}`;
      params.set(
        'fieldSelector',
        existingFieldSelector ? `${existingFieldSelector},${nameSelector}` : nameSelector
      );
    } else if (options.fieldSelector) {
      params.set('fieldSelector', options.fieldSelector);
    }

    return `${url}?${params}`;
  }

  /**
   * Start watching a resource.
   */
  private async startWatch(options: WatchOptions, connection: ManagedConnection): Promise<void> {
    const url = this.buildUrl(options, connection);

    connection.isConnecting = true;
    connection.lastActivity = Date.now();

    try {
      const response = await fetch(url, {
        signal: connection.controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Watch failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      connection.isConnecting = false;
      connection.lastActivity = Date.now();

      const decoder = new TextDecoder();
      let buffer = '';
      let receivedData = false;
      const startTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        receivedData = true;
        connection.lastActivity = Date.now(); // Update activity on each chunk
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const event = parseWatchEvent(line);
          if (!event) continue;

          // Update resourceVersion for reconnection
          const resourceVersion = extractResourceVersion(event.object);
          if (resourceVersion) {
            connection.resourceVersion = resourceVersion;
          }

          // Broadcast to all subscribers
          connection.subscribers.forEach((subscriber) => subscriber(event));
        }
      }

      // Connection closed - check if it was a healthy connection
      const connectionDuration = Date.now() - startTime;
      const MIN_HEALTHY_DURATION = 5000; // 5 seconds
      const NORMAL_RECONNECT_DELAY = 1000; // 1 second
      const SINGLE_RESOURCE_RECONNECT_DELAY = 30000; // 30 seconds for single resource watches

      // Check if this is a single resource watch (name specified)
      const isSingleResourceWatch = !!options.name;

      if (receivedData && connectionDuration >= MIN_HEALTHY_DURATION) {
        // Healthy connection that ran for a while - reconnect quickly
        connection.reconnectAttempts = 0;
        this.scheduleReconnect(options, connection, NORMAL_RECONNECT_DELAY);
      } else if (receivedData && isSingleResourceWatch && connection.resourceVersion !== '0') {
        // Single resource watch that received data and updated resourceVersion
        // This is expected behavior for path-based single resource watches
        // (especially cluster-scoped resources where we can't use fieldSelector)
        // Reconnect after a longer delay to poll for updates
        connection.reconnectAttempts = 0;
        this.scheduleReconnect(options, connection, SINGLE_RESOURCE_RECONNECT_DELAY);
      } else {
        // Connection closed too quickly or without data - treat as error
        // This prevents infinite loops when server immediately closes connection
        throw new Error(
          `Watch connection closed prematurely (duration: ${connectionDuration}ms, received data: ${receivedData})`
        );
      }
    } catch (error) {
      connection.isConnecting = false;

      // Aborted intentionally, don't reconnect
      if (connection.controller.signal.aborted) {
        return;
      }

      // Exponential backoff reconnection
      if (connection.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, connection.reconnectAttempts);
        connection.reconnectAttempts++;
        this.scheduleReconnect(options, connection, delay);
      } else {
        // Max retries exceeded, notify subscribers
        const errorEvent: WatchEvent = {
          type: 'ERROR',
          object: {
            message: 'Watch connection failed after max retries',
            error: error instanceof Error ? error.message : String(error),
          },
        };
        connection.subscribers.forEach((subscriber) => subscriber(errorEvent));
      }
    }
  }

  /**
   * Schedule a reconnection attempt.
   */
  private scheduleReconnect(
    options: WatchOptions,
    connection: ManagedConnection,
    delay: number
  ): void {
    setTimeout(() => {
      if (this.connections.has(connection.key)) {
        // Create new abort controller for new connection
        connection.controller = new AbortController();
        this.startWatch(options, connection);
      }
    }, delay);
  }

  /**
   * Disconnect all watch connections.
   * Call this on app unmount.
   */
  disconnectAll(): void {
    this.connections.forEach((connection) => {
      if (connection.cleanupTimeout) {
        clearTimeout(connection.cleanupTimeout);
      }
      connection.controller.abort();
    });
    this.connections.clear();
  }

  /**
   * Get current connection count (for debugging).
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

// Singleton instance
export const watchManager = new WatchManager();
