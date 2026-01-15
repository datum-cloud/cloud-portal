// app/modules/watch/watch.manager.ts
import { parseWatchEvent, extractResourceVersion } from './watch.parser';
import type { WatchConnection, WatchOptions, WatchSubscriber, WatchEvent } from './watch.types';
import { logger } from '@/modules/logger';
import { isDev } from '@/utils/env';

// Configuration
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;
const CLEANUP_DELAY_MS = 100; // Handles React Strict Mode re-mounts
const HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
const STALE_THRESHOLD_MS = 60000; // 1 minute without activity = stale
const CONNECTION_TIMEOUT_MS = 30000; // 30 seconds without data = timeout

const SERVICE_NAME = 'WatchManager';

function debug(message: string, data?: Record<string, unknown>) {
  if (isDev()) {
    logger.debug(`[${SERVICE_NAME}] ${message}`, { type: 'watch', ...data });
  }
}

// Extended connection type to store options for reconnection
interface ManagedConnection extends WatchConnection {
  options: WatchOptions;
  lastActivity: number;
  isConnecting: boolean;
  cleanupTimeout?: ReturnType<typeof setTimeout>;
  timeoutTimer?: ReturnType<typeof setTimeout>;
}

/**
 * WatchManager handles K8s Watch API connections with:
 * - Connection pooling (shared connections for same resource)
 * - Automatic reconnection with exponential backoff
 * - resourceVersion tracking for gap-free updates
 * - Subscriber pattern for broadcasting events
 * - Visibility change handling (reconnect when tab becomes visible)
 * - Periodic health checks (detect dead connections)
 * - Connection timeout detection (no data = reconnect)
 * - Delayed cleanup to handle React Strict Mode re-mounts
 * - HMR-safe singleton (persists across hot reloads)
 */
class WatchManager {
  private connections = new Map<string, ManagedConnection>();
  private visibilityListenerAttached = false;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    debug('WatchManager created');
  }

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
    // Attach visibility listener and start health check on first subscription
    this.attachVisibilityListener();
    this.startHealthCheck();

    const key = this.buildKey(options);
    const existing = this.connections.get(key);

    debug('Subscribe', { key, status: existing ? 'existing' : 'new' });

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
   * Start periodic health check to detect and reconnect dead connections.
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval || typeof window === 'undefined') return;

    debug('Starting health check interval', {});

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  /**
   * Stop periodic health check.
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      debug('Stopped health check interval', {});
    }
  }

  /**
   * Check all connections and reconnect stale ones.
   */
  private performHealthCheck(): void {
    const now = Date.now();
    let activeCount = 0;
    let reconnectedCount = 0;

    this.connections.forEach((connection, key) => {
      const timeSinceActivity = now - connection.lastActivity;
      activeCount++;

      // If connection is stale and not currently connecting, reconnect
      if (timeSinceActivity > STALE_THRESHOLD_MS && !connection.isConnecting) {
        debug('Health check: reconnecting stale connection', {
          key,
          inactiveMs: timeSinceActivity,
        });
        this.forceReconnect(connection);
        reconnectedCount++;
      }
    });

    debug('Health check completed', { activeCount, reconnectedCount });

    // Stop health check if no connections
    if (activeCount === 0) {
      this.stopHealthCheck();
    }
  }

  /**
   * Force reconnect a connection.
   */
  private forceReconnect(connection: ManagedConnection): void {
    // Clear any existing timeout timer
    if (connection.timeoutTimer) {
      clearTimeout(connection.timeoutTimer);
      connection.timeoutTimer = undefined;
    }

    // Abort current connection
    connection.controller.abort();
    connection.controller = new AbortController();
    connection.reconnectAttempts = 0;

    // Start new watch
    this.startWatch(connection.options, connection);
  }

  /**
   * Attach visibility change listener to manage connections based on tab visibility.
   * - When tab becomes hidden: pause all connections (abort but keep subscriptions)
   * - When tab becomes visible: reconnect all paused connections
   *
   * This helps avoid HTTP/1.1's 6-connection-per-domain limit when multiple tabs are open.
   */
  private attachVisibilityListener(): void {
    if (this.visibilityListenerAttached || typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        debug('Tab became visible, reconnecting all connections', {});
        this.handleTabVisible();
      } else {
        debug('Tab became hidden, pausing all connections', {});
        this.handleTabHidden();
      }
    });

    this.visibilityListenerAttached = true;
    debug('Visibility listener attached', {});
  }

  /**
   * Handle tab becoming hidden - pause all connections to free up HTTP connections.
   * Connections are aborted but subscriptions are preserved for reconnection.
   */
  private handleTabHidden(): void {
    this.connections.forEach((connection, key) => {
      // Clear any pending cleanup or timeout timers
      if (connection.cleanupTimeout) {
        clearTimeout(connection.cleanupTimeout);
        connection.cleanupTimeout = undefined;
      }
      if (connection.timeoutTimer) {
        clearTimeout(connection.timeoutTimer);
        connection.timeoutTimer = undefined;
      }

      // Abort the connection to free up HTTP slot
      connection.controller.abort();
      debug('Paused connection', { key });
    });
  }

  /**
   * Handle tab becoming visible - reconnect all connections.
   */
  private handleTabVisible(): void {
    this.connections.forEach((connection, key) => {
      // Create new abort controller and reconnect
      connection.controller = new AbortController();
      connection.reconnectAttempts = 0;
      debug('Reconnecting connection', { key });
      this.startWatch(connection.options, connection);
    });
  }

  /**
   * Start connection timeout timer.
   * If no data received within timeout, force reconnect.
   */
  private startTimeoutTimer(connection: ManagedConnection): void {
    // Clear existing timer
    if (connection.timeoutTimer) {
      clearTimeout(connection.timeoutTimer);
    }

    connection.timeoutTimer = setTimeout(() => {
      const timeSinceActivity = Date.now() - connection.lastActivity;

      // Only reconnect if still no activity
      if (timeSinceActivity >= CONNECTION_TIMEOUT_MS && !connection.isConnecting) {
        debug('Timeout: no data received, reconnecting', { key: connection.key });
        this.forceReconnect(connection);
      }
    }, CONNECTION_TIMEOUT_MS);
  }

  /**
   * Unsubscribe from watch events.
   * Uses delayed cleanup to handle React Strict Mode re-mounts.
   */
  private unsubscribe(key: string, callback: WatchSubscriber): void {
    const connection = this.connections.get(key);
    if (!connection) return;

    connection.subscribers.delete(callback);
    debug('Unsubscribe', { key, remaining: connection.subscribers.size });

    if (connection.subscribers.size === 0) {
      // Delay cleanup to allow re-subscription (React Strict Mode)
      connection.cleanupTimeout = setTimeout(() => {
        // Double-check no new subscribers were added
        if (connection.subscribers.size === 0) {
          debug('Cleanup: removing connection', { key });

          // Clear timeout timer
          if (connection.timeoutTimer) {
            clearTimeout(connection.timeoutTimer);
          }

          connection.controller.abort();
          this.connections.delete(key);

          // Stop health check if no more connections
          if (this.connections.size === 0) {
            this.stopHealthCheck();
          }
        }
      }, CLEANUP_DELAY_MS);
    }
  }

  /**
   * Build the URL for K8s Watch API.
   */
  private buildUrl(options: WatchOptions, connection: WatchConnection): string {
    const { resourceType, projectId, namespace, name } = options;

    let url: string;
    const isClusterScoped = !projectId && !namespace;

    if (projectId) {
      const parts = resourceType.split('/');
      const resourceName = parts.pop();
      const apiPath = parts.join('/');

      url = `/api/proxy/apis/resourcemanager.miloapis.com/v1alpha1/projects/${projectId}/control-plane/${apiPath}/namespaces/${namespace}/${resourceName}`;
    } else if (namespace) {
      const parts = resourceType.split('/');
      const resourceName = parts.pop();
      const apiPath = parts.join('/');

      url = `/api/proxy/${apiPath}/namespaces/${namespace}/${resourceName}`;
    } else {
      url = `/api/proxy/${resourceType}`;
    }

    if (isClusterScoped && name) {
      url += `/${name}`;
    }

    const params = new URLSearchParams({
      watch: 'true',
      resourceVersion: connection.resourceVersion,
      timeoutSeconds: String(options.timeoutSeconds || 30), // k8s watch timeout
    });

    if (options.labelSelector) {
      params.set('labelSelector', options.labelSelector);
    }

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

    debug('Starting watch', { key: connection.key, url });

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

      // Start timeout timer
      this.startTimeoutTimer(connection);

      debug('Watch connected', { key: connection.key });

      const decoder = new TextDecoder();
      let buffer = '';
      let receivedData = false;
      const startTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        receivedData = true;
        connection.lastActivity = Date.now();

        // Reset timeout timer on each data chunk
        this.startTimeoutTimer(connection);

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const event = parseWatchEvent(line);
          if (!event) continue;

          // Handle 410 Gone / Resource Version Expired
          // Reset resourceVersion and reconnect fresh
          if (event.type === 'ERROR') {
            const status = event.object as { code?: number; reason?: string };
            if (status.code === 410 || status.reason === 'Expired') {
              debug('Resource version expired, resetting to 0', { key: connection.key });
              connection.resourceVersion = '0';
              connection.reconnectAttempts = 0;
              // Close current connection and reconnect
              reader.cancel();
              this.scheduleReconnect(options, connection, 100);
              return;
            }
          }

          const resourceVersion = extractResourceVersion(event.object);
          if (resourceVersion) {
            connection.resourceVersion = resourceVersion;
          }

          debug('Event received', {
            key: connection.key,
            type: event.type,
            name: (event.object as any)?.metadata?.name,
          });

          connection.subscribers.forEach((subscriber) => subscriber(event));
        }
      }

      // Connection closed
      const connectionDuration = Date.now() - startTime;
      const MIN_HEALTHY_DURATION = 3000;
      const NORMAL_RECONNECT_DELAY = 1000;
      const SINGLE_RESOURCE_RECONNECT_DELAY = 30000;

      const isSingleResourceWatch = !!options.name;

      debug('Watch closed', { key: connection.key, durationMs: connectionDuration, receivedData });

      if (receivedData && connectionDuration >= MIN_HEALTHY_DURATION) {
        connection.reconnectAttempts = 0;
        this.scheduleReconnect(options, connection, NORMAL_RECONNECT_DELAY);
      } else if (receivedData && isSingleResourceWatch && connection.resourceVersion !== '0') {
        connection.reconnectAttempts = 0;
        this.scheduleReconnect(options, connection, SINGLE_RESOURCE_RECONNECT_DELAY);
      } else {
        throw new Error(
          `Watch connection closed prematurely (duration: ${connectionDuration}ms, received data: ${receivedData})`
        );
      }
    } catch (error) {
      connection.isConnecting = false;

      // Clear timeout timer
      if (connection.timeoutTimer) {
        clearTimeout(connection.timeoutTimer);
        connection.timeoutTimer = undefined;
      }

      // Aborted intentionally, don't reconnect
      if (connection.controller.signal.aborted) {
        debug('Watch aborted', { key: connection.key });
        return;
      }

      debug('Watch error', {
        key: connection.key,
        error: error instanceof Error ? error.message : String(error),
      });

      // Exponential backoff reconnection
      if (connection.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, connection.reconnectAttempts);
        connection.reconnectAttempts++;
        debug('Scheduling reconnect', {
          key: connection.key,
          attempt: connection.reconnectAttempts,
          delayMs: delay,
        });
        this.scheduleReconnect(options, connection, delay);
      } else {
        debug('Max retries exceeded', { key: connection.key });
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
    debug('Disconnecting all', { connectionCount: this.connections.size });

    this.stopHealthCheck();

    this.connections.forEach((connection) => {
      if (connection.cleanupTimeout) {
        clearTimeout(connection.cleanupTimeout);
      }
      if (connection.timeoutTimer) {
        clearTimeout(connection.timeoutTimer);
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

  /**
   * Get connection status (for debugging).
   */
  getStatus(): Array<{
    key: string;
    lastActivity: number;
    isConnecting: boolean;
    subscribers: number;
  }> {
    return Array.from(this.connections.entries()).map(([key, conn]) => ({
      key,
      lastActivity: Date.now() - conn.lastActivity,
      isConnecting: conn.isConnecting,
      subscribers: conn.subscribers.size,
    }));
  }
}

/**
 * Get or create the singleton WatchManager instance.
 * Uses window storage in development to survive HMR.
 */
function getWatchManager(): WatchManager {
  // Server-side: always create new instance
  if (typeof window === 'undefined') {
    return new WatchManager();
  }

  // Client-side in development: use window storage for HMR persistence
  const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV === 'development';

  if (isDev) {
    const key = '__watchManager';
    if (!(window as any)[key]) {
      debug('Creating HMR-safe singleton');
      (window as any)[key] = new WatchManager();
    }
    return (window as any)[key];
  }

  // Production: module-level singleton
  return new WatchManager();
}

// Singleton instance
export const watchManager = getWatchManager();

// Expose debug utilities in development
if (
  typeof window !== 'undefined' &&
  (import.meta.env?.DEV ?? process.env.NODE_ENV === 'development')
) {
  (window as any).__enableWatchDebug = () => {
    (window as any).__WATCH_DEBUG = true;
    console.log('[WatchManager] Debug mode enabled. Refresh to see logs.');
  };
  (window as any).__disableWatchDebug = () => {
    (window as any).__WATCH_DEBUG = false;
    console.log('[WatchManager] Debug mode disabled.');
  };
  (window as any).__watchStatus = () => {
    console.log('[WatchManager] Status:', watchManager.getStatus());
  };
}
