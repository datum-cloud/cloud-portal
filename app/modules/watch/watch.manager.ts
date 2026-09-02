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
import { buildWatchChannelKey } from './watch.channel-key';
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
 *
 * Why 500ms (not the original 100ms): downstream effects can re-run after a
 * permission check resolves and triggers a re-render — if that re-run happens
 * to land after the 100ms window, the watch channel is torn down server-side
 * and the SSE stream emits `unsubscribed`. 500ms is generous enough to ride
 * out a typical permission-bulk roundtrip without introducing user-visible
 * delay on intentional unsubscribes (component unmounts during navigation).
 */
const CLEANUP_DELAY_MS = 500;

interface ChannelSubscription {
  subscribers: Set<WatchSubscriber<unknown>>;
  watchOptions: WatchOptions;
}

/**
 * A user-scoped subscription taken before the server told us who we are.
 * Held whole (options + callback) rather than keyed by channel, because the
 * channel name is precisely what cannot be computed yet.
 */
interface DeferredSubscription {
  options: WatchOptions;
  callback: WatchSubscriber<unknown>;
  /**
   * Set once the entry has been drained into a real channel. Until then the
   * channel key cannot be derived at all, so unsubscribing must not try.
   */
  attached: boolean;
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
export class WatchManager {
  private clientId: string;
  /**
   * Session user id, learned from the server's `connected` event. Channel
   * keys for user-scoped watches embed it, so it is not optional detail:
   * without it this manager cannot name the channel the hub will use.
   *
   * Fixed for the lifetime of the manager in practice — the SSE stream is
   * authenticated by the session cookie, and changing sessions means a
   * document load, which builds a new manager.
   */
  private userId: string | null = null;
  private channels = new Map<string, ChannelSubscription>();
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private controller: AbortController | null = null;
  private isConnected = false;
  private pendingSubscriptions = new Map<string, WatchOptions>();
  private cleanupTimers = new Map<
    string,
    { timer: ReturnType<typeof setTimeout>; callback: WatchSubscriber<unknown> }
  >();
  private deferredSubscriptions = new Set<DeferredSubscription>();
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
    const typedCallback = callback as WatchSubscriber<unknown>;

    // A user-scoped channel key embeds the session user id, which only the
    // server can supply. Hold the subscription until the `connected` event
    // delivers it: keying the channel any other way would mean listening on
    // a name the hub never broadcasts. Nothing is lost by waiting — no
    // subscribe is sent to the server before `connected` either.
    if (options.userScoped && !this.userId) {
      const deferred: DeferredSubscription = {
        options,
        callback: typedCallback,
        attached: false,
      };
      this.deferredSubscriptions.add(deferred);
      return () => {
        this.deferredSubscriptions.delete(deferred);
        // Never attached — including the case where `disconnectAll()` dropped
        // the queue. There is no channel to schedule a cleanup against, and
        // asking for its key would throw.
        if (!deferred.attached) return;
        this.scheduleCleanup(options, typedCallback);
      };
    }

    return this.attach(options, typedCallback);
  }

  /**
   * Add a subscriber to its channel, creating the channel (and the server-side
   * subscription) if this is the first one.
   */
  private attach(options: WatchOptions, callback: WatchSubscriber<unknown>): () => void {
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

    this.channels.get(channel)!.subscribers.add(callback);

    return () => this.scheduleCleanup(options, callback);
  }

  /**
   * Schedule the delayed removal of a subscriber. The channel key is derived
   * again here rather than captured at subscribe time, so a subscription taken
   * before the user id arrived still cleans up under the key it ended up with.
   */
  private scheduleCleanup(options: WatchOptions, callback: WatchSubscriber<unknown>): void {
    const channel = this.buildChannelKey(options);
    this.cleanupTimers.set(channel, {
      timer: setTimeout(() => {
        this.doUnsubscribe(channel, callback);
        this.cleanupTimers.delete(channel);
      }, CLEANUP_DELAY_MS),
      callback,
    });
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
    this.deferredSubscriptions.clear();

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
          this.applyServerIdentity(parsed.userId);

          // Server has registered the client — safe to send subscriptions now
          this.isConnected = true;

          // User-scoped subscriptions held back until the id arrived can now
          // be keyed. Attaching while `isConnected` is already true sends
          // their server subscribe directly.
          //
          // Guarded on the id actually having arrived: draining without one
          // would throw inside `buildChannelKey`, and this whole block runs
          // under a catch that discards parse errors — the queue would be
          // gone, `pendingSubscriptions` never flushed, and every watch in
          // the tab dead with nothing but one warning to show for it.
          if (this.userId !== null) {
            const deferred = Array.from(this.deferredSubscriptions);
            this.deferredSubscriptions.clear();
            for (const entry of deferred) {
              entry.attached = true;
              this.attach(entry.options, entry.callback);
            }
          }

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

        // Both mean the channel's upstream is (re)opening — see
        // WatchEventType.RESYNC for what that triggers downstream.
        //
        // - `subscribed` fires on first mount AND on every re-subscribe: tab
        //   backgrounding aborts the SSE fetch, the hub's zero-subscriber
        //   grace period closes the upstream, and returning opens a fresh
        //   one — so does resubscribeAll() after the SSE stream ends.
        // - `resync` is the hub resetting resourceVersion after a 410 Gone;
        //   routine in Kubernetes and broadcast to every subscriber since no
        //   client asked for it.
        case 'subscribed':
        case 'resync': {
          const channel = parsed.channel as string;
          const sub = this.channels.get(channel);
          if (!sub) return;

          const resyncEvent: WatchEvent<unknown> = {
            type: 'RESYNC',
            object: { channel },
          };

          for (const subscriber of Array.from(sub.subscribers)) {
            subscriber(resyncEvent);
          }
          break;
        }
        // unsubscribed, heartbeat — no action needed
      }
    } catch {
      // Invalid JSON — skip
    }
  }

  /**
   * Record the session user id from the `connected` handshake.
   *
   * Warns rather than silently no-ops on the two cases that would strand
   * user-scoped watches: a handshake without an id (nothing would ever leave
   * the deferred queue), and an id that changes mid-connection (channels
   * created under the previous identity keep their old keys and go quiet).
   * Neither is reachable today; both are silent if they ever become so.
   */
  private applyServerIdentity(userId: unknown): void {
    const next = typeof userId === 'string' && userId.length > 0 ? userId : null;

    if (next === null) {
      console.warn('[WatchManager] connected without a user id — user-scoped watches will not run');
      return;
    }
    if (this.userId !== null && this.userId !== next) {
      console.warn('[WatchManager] session user changed on an open stream; reload expected');
    }

    this.userId = next;
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
          userScoped: options.userScoped,
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
   * Build the deterministic channel key for a set of watch options.
   *
   * Delegates to {@link buildWatchChannelKey}, which the server-side
   * `WatchHub.buildWatchKey()` also calls — the two must derive the same
   * string or subscribe, unsubscribe and event routing all miss.
   */
  private buildChannelKey(options: WatchOptions): string {
    return buildWatchChannelKey(options, this.userId ?? undefined);
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
