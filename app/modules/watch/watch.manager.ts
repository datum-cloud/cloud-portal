// app/modules/watch/watch.manager.ts
//
// Multiplexed Watch Manager
//
// Instead of opening N direct fetch streams to K8s (one per resource),
// this implementation opens 1 SSE connection to the server-side WatchHub
// and sends subscribe/unsubscribe POST requests to control which resources
// are watched. This reduces HTTP/1.1 connection usage from N+1 to 1,
// freeing slots for task queue mutations and API fetches.
//
// Public API is unchanged — all consumers (useResourceWatch, waitForWatch,
// WatchProvider) work without modification.
import type { WatchOptions, WatchEvent, WatchSubscriber } from './watch.types';

/** Base delay before reconnecting after the SSE stream drops (ms). */
const SSE_RECONNECT_BASE_DELAY = 1000;
/** Maximum delay between SSE reconnection attempts (ms). */
const SSE_RECONNECT_MAX_DELAY = 60000;
/** Maximum number of consecutive SSE reconnection attempts before giving up. */
const SSE_MAX_RETRIES = 10;
/**
 * Delay before actually removing a subscriber after unsubscribe is called.
 * Handles React Strict Mode's mount → unmount → mount cycle: the first
 * unmount schedules a delayed cleanup, and the immediate re-mount cancels it.
 */
const CLEANUP_DELAY_MS = 100;

interface ChannelSubscription {
  subscribers: Set<WatchSubscriber<unknown>>;
  watchOptions: WatchOptions;
}

/**
 * WatchManager multiplexes all K8s watch subscriptions through a single SSE
 * connection to the server-side WatchHub. The server handles upstream K8s
 * connections, deduplication, and fan-out.
 *
 * Features:
 * - Single SSE connection per browser tab (1 HTTP slot instead of N)
 * - Subscribe/unsubscribe via POST requests
 * - Automatic reconnection with exponential backoff
 * - Visibility change handling (disconnect on hidden, reconnect on visible)
 * - Delayed cleanup for React Strict Mode re-mounts
 * - HMR-safe singleton (persists across hot reloads)
 */
class WatchManager {
  private clientId: string;
  private channels = new Map<string, ChannelSubscription>();
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private controller: AbortController | null = null;
  private isConnected = false;
  private pendingSubscriptions = new Map<string, WatchOptions>();
  private cleanupTimers = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; callback: WatchSubscriber<unknown> }
  >();
  private visibilityListenerAttached = false;
  private visibilityHandler: (() => void) | null = null;
  private reconnectAttempts = 0;

  constructor() {
    this.clientId = crypto.randomUUID();
    if (typeof window !== 'undefined') {
      this.connect();
      this.attachVisibilityListener();
    }
  }

  // ─── Public API (same signature as before) ──────

  /**
   * Subscribe to watch events for a K8s resource.
   *
   * If a channel for this resource already exists, the callback is added to
   * the existing subscriber set. Otherwise a new channel is created and
   * a `POST /api/watch/subscribe` is sent to the server.
   *
   * @returns An unsubscribe function. Calling it schedules a delayed cleanup
   *          ({@link CLEANUP_DELAY_MS}) to handle React Strict Mode re-mounts.
   *          When the last subscriber is removed, the channel is torn down and
   *          a server-side unsubscribe is sent.
   */
  subscribe<T = unknown>(options: WatchOptions, callback: WatchSubscriber<T>): () => void {
    const channel = this.buildChannelKey(options);

    // Cancel pending cleanup (React Strict Mode re-mount)
    // Also remove the stale callback that was pending cleanup — otherwise
    // Strict Mode's mount/unmount/mount cycle leaks orphan callbacks that
    // prevent the channel from ever reaching subscriber count 0.
    const pending = this.cleanupTimers.get(channel);
    if (pending) {
      clearTimeout(pending.timer);
      const sub = this.channels.get(channel);
      if (sub) sub.subscribers.delete(pending.callback);
      this.cleanupTimers.delete(channel);
    }

    if (!this.channels.has(channel)) {
      this.channels.set(channel, {
        subscribers: new Set(),
        watchOptions: options,
      });

      // Subscribe on server
      if (this.isConnected) {
        this.serverSubscribe(options);
      } else {
        this.pendingSubscriptions.set(channel, options);
      }
    }

    this.channels.get(channel)!.subscribers.add(callback as WatchSubscriber<unknown>);

    // Return unsubscribe function
    const typedCallback = callback as WatchSubscriber<unknown>;
    return () => {
      this.cleanupTimers.set(channel, {
        timer: setTimeout(() => {
          this.doUnsubscribe(channel, typedCallback);
          this.cleanupTimers.delete(channel);
        }, CLEANUP_DELAY_MS),
        callback: typedCallback,
      });
    };
  }

  /** Unsubscribe all channels, close the SSE connection, and clear all state. */
  disconnectAll(): void {
    // Unsubscribe all channels on server
    for (const [channel] of this.channels) {
      this.serverUnsubscribe(channel);
    }
    this.channels.clear();

    // Clear pending cleanup timers
    for (const { timer } of this.cleanupTimers.values()) {
      clearTimeout(timer);
    }
    this.cleanupTimers.clear();

    // Close SSE connection
    this.controller?.abort();
    this.reader = null;
    this.isConnected = false;

    // Remove visibility listener
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityListenerAttached = false;
      this.visibilityHandler = null;
    }
  }

  /** Number of active watch channels. */
  getConnectionCount(): number {
    return this.channels.size;
  }

  /** Debug snapshot of connection state. Accessible via `window.__watchStatus()`. */
  getStatus() {
    return {
      clientId: this.clientId,
      connected: this.isConnected,
      channels: Array.from(this.channels.keys()),
      subscriberCounts: Object.fromEntries(
        Array.from(this.channels.entries()).map(([k, v]) => [k, v.subscribers.size])
      ),
    };
  }

  // ─── SSE Connection ──────────────────────────────

  /** Open the SSE stream to `GET /api/watch/stream` and flush pending subscriptions. */
  private async connect(): Promise<void> {
    this.controller = new AbortController();

    try {
      const response = await fetch(`/api/watch/stream?cid=${this.clientId}`, {
        signal: this.controller.signal,
        headers: { Accept: 'text/event-stream' },
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      this.reader = response.body.getReader();
      this.reconnectAttempts = 0;

      // Don't set isConnected or flush pending here — wait for the
      // server's "connected" SSE event which confirms the client is
      // registered. Flushing too early causes a race: the subscribe
      // POST arrives before registerClient() completes → 403.

      // Read SSE stream (will process "connected" event inside)
      await this.readStream();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this.isConnected = false;

      this.scheduleReconnect();
    }
  }

  /** Read the SSE byte stream, parse messages, and dispatch to handlers. */
  private async readStream(): Promise<void> {
    if (!this.reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await this.reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE format: "event: <type>\ndata: <json>\n\n"
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          this.handleSSEMessage(message);
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }

    // Stream ended — reconnect and re-subscribe
    this.isConnected = false;
    this.resubscribeAll();
    this.scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   * Stops attempting after {@link SSE_MAX_RETRIES} consecutive failures.
   * Visibility change resets the counter, allowing fresh attempts when the tab returns.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= SSE_MAX_RETRIES) return;

    const delay = Math.min(
      SSE_RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      SSE_RECONNECT_MAX_DELAY
    );
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }

  /** Route a parsed SSE message to the appropriate channel subscribers. */
  private handleSSEMessage(raw: string): void {
    let event = '';
    const dataLines: string[] = [];

    for (const line of raw.split('\n')) {
      if (line.startsWith('event: ')) {
        event = line.slice(7);
      } else if (line.startsWith('data: ')) {
        dataLines.push(line.slice(6));
      } else if (line === 'data:') {
        dataLines.push('');
      }
    }

    if (!event || dataLines.length === 0) return;

    const data = dataLines.join('\n');

    try {
      const parsed = JSON.parse(data);

      switch (event) {
        case 'connected': {
          // Server has registered the client — safe to send subscriptions now
          this.isConnected = true;

          for (const opts of this.pendingSubscriptions.values()) {
            this.serverSubscribe(opts);
          }
          this.pendingSubscriptions.clear();
          break;
        }

        case 'watch': {
          const channel = parsed.channel as string;
          const sub = this.channels.get(channel);
          if (!sub) return;

          const watchEvent: WatchEvent<unknown> = {
            type: parsed.type,
            object: parsed.object,
          };

          for (const subscriber of Array.from(sub.subscribers)) {
            subscriber(watchEvent);
          }
          break;
        }
        case 'watch-error': {
          const channel = parsed.channel as string;
          const sub = this.channels.get(channel);
          if (!sub) return;

          const errorEvent: WatchEvent<unknown> = {
            type: 'ERROR',
            object: parsed,
          };

          for (const subscriber of Array.from(sub.subscribers)) {
            subscriber(errorEvent);
          }
          break;
        }
        // subscribed, unsubscribed, heartbeat — no action needed
      }
    } catch {
      // Invalid JSON — skip
    }
  }

  // ─── Server Communication ────────────────────────

  /** Send `POST /api/watch/subscribe` to the server-side WatchHub. */
  private async serverSubscribe(options: WatchOptions): Promise<void> {
    try {
      const response = await fetch('/api/watch/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: this.clientId,
          resourceType: options.resourceType,
          orgId: options.orgId,
          projectId: options.projectId,
          namespace: options.namespace,
          name: options.name,
          labelSelector: options.labelSelector,
          fieldSelector: options.fieldSelector,
        }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.warn(
          `[WatchManager] subscribe failed (${response.status}): ${body}`,
          options.resourceType
        );
      }
    } catch (err) {
      console.warn('[WatchManager] subscribe network error:', err);
      // Will retry on reconnect
    }
  }

  /** Send `POST /api/watch/unsubscribe` to the server-side WatchHub. */
  private async serverUnsubscribe(channel: string): Promise<void> {
    try {
      await fetch('/api/watch/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: this.clientId,
          channel,
        }),
      });
    } catch {
      // Best effort
    }
  }

  // ─── Helpers ─────────────────────────────────────

  /** Remove a single subscriber from a channel; tear down channel if empty. */
  private doUnsubscribe(channel: string, callback: WatchSubscriber<unknown>): void {
    const sub = this.channels.get(channel);
    if (!sub) return;

    sub.subscribers.delete(callback);

    if (sub.subscribers.size === 0) {
      this.channels.delete(channel);
      this.serverUnsubscribe(channel);
    }
  }

  /** Queue all active channels for re-subscription on next connect. */
  private resubscribeAll(): void {
    this.pendingSubscriptions.clear();
    for (const [channel, sub] of this.channels) {
      this.pendingSubscriptions.set(channel, sub.watchOptions);
    }
  }

  /**
   * Build a deterministic channel key from watch options.
   * Must match the server-side `WatchHub.buildWatchKey()` format exactly.
   */
  private buildChannelKey(options: WatchOptions): string {
    return [
      options.resourceType,
      options.orgId ?? '',
      options.projectId ?? '',
      options.namespace ?? '',
      options.name ?? '',
      options.labelSelector ?? '',
      options.fieldSelector ?? '',
    ].join(':');
  }

  /** Disconnect when tab is hidden; reconnect when visible (saves connections). */
  private attachVisibilityListener(): void {
    if (this.visibilityListenerAttached) return;
    this.visibilityListenerAttached = true;

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.controller?.abort();
        this.isConnected = false;
      } else if (!this.isConnected) {
        this.reconnectAttempts = 0;
        this.resubscribeAll();
        this.connect();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
}

// ─── Singleton ─────────────────────────────────────

/**
 * Get or create the singleton WatchManager instance.
 * Persists across HMR reloads by storing on `window.__watchManager`.
 * Returns a no-op instance on the server (SSR).
 */
function getWatchManager(): WatchManager {
  if (typeof window === 'undefined') {
    return new WatchManager();
  }

  // HMR persistence
  const win = window as unknown as { __watchManager?: WatchManager };
  if (import.meta.hot) {
    if (!win.__watchManager) {
      win.__watchManager = new WatchManager();
    }
    return win.__watchManager;
  }

  if (!win.__watchManager) {
    win.__watchManager = new WatchManager();
  }
  return win.__watchManager;
}

export const watchManager = getWatchManager();

// Debug utilities — call `window.__watchStatus()` in browser console
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const win = window as unknown as Record<string, unknown>;
  win.__watchStatus = () => {
    console.table(watchManager.getStatus());
  };
}
