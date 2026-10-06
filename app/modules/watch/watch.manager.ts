// app/modules/watch/watch.manager.ts
//
// Multiplexed Watch Manager
//
// Instead of opening N direct fetch streams to K8s (one per resource),
// this implementation opens 1 SSE connection to the server-side WatchHub
// and sends subscribe/unsubscribe POST requests to control which resources
// are watched. This reduces HTTP/1.1 connection usage from N+1 to 1,
// freeing slots for task queue mutations and API fetches.
import {
  OneShotTimer,
  jitteredBackoff,
  systemClock,
  type TimerHandle,
  type WatchClock,
} from './watch-clock';
import { parseHubMessage, splitSseFrames, type HubMessage } from './watch-sse';
import { SubscribeClient, type WatchBreadcrumb } from './watch-subscriptions';
import type {
  ResyncPayload,
  ResyncReason,
  WatchOptions,
  WatchEvent,
  WatchSubscriber,
} from './watch.types';
import { noteRateLimitedResponse, parseRetryAfter } from '@/modules/rate-limit';
import { addBreadcrumb } from '@/modules/sentry/capture';

export { RECONNECT_MAX_DELAY_MS, type WatchClock } from './watch-clock';
export { MAX_SUBSCRIBE_FAILURES, type WatchBreadcrumb } from './watch-subscriptions';

export const HIDDEN_GRACE_MS = 30_000;
/** Silence (no event, not even a heartbeat) after which the stream is presumed dead (ms). */
export const WATCHDOG_MS = 15_000;
/** Per-channel throttle so an upstream that keeps sending ERROR does not refetch on each. */
export const ERROR_RESYNC_THROTTLE_MS = 10_000;
/** Base delay before reconnecting after the SSE stream drops (ms). */
const RECONNECT_BASE_DELAY_MS = 1000;
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

export type WatchConnectionState = 'live' | 'reconnecting' | 'degraded';

interface ChannelSubscription {
  subscribers: Set<WatchSubscriber<unknown>>;
  watchOptions: WatchOptions;
}

export interface WatchManagerEnv {
  document: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;
  window: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

export interface WatchManagerOptions {
  hiddenGraceMs?: number;
  watchdogMs?: number;
  reconnectBaseMs?: number;
  errorResyncThrottleMs?: number;
  breadcrumb?: WatchBreadcrumb;
  autoConnect?: boolean;
  env?: WatchManagerEnv;
  clock?: WatchClock;
}

const defaultBreadcrumb: WatchBreadcrumb = (message, data, level = 'info') =>
  addBreadcrumb(level, message, 'watch', data);

/**
 * WatchManager multiplexes all K8s watch subscriptions through a single SSE
 * connection to the server-side WatchHub. The server handles upstream K8s
 * connections, deduplication, and fan-out.
 *
 * Every reconnect ends in a RESYNC on each channel, because the hub does not
 * replay what was missed.
 *
 * - Delayed cleanup for React Strict Mode re-mounts
 * - HMR-safe singleton (persists across hot reloads)
 */
export class WatchManager {
  private clientId: string;
  private channels = new Map<string, ChannelSubscription>();
  private controller: AbortController | null = null;
  private isConnected = false;
  private pendingSubscriptions = new Map<string, WatchOptions>();
  private cleanupTimers = new Map<
    string,
    { timer: TimerHandle; callback: WatchSubscriber<unknown> }
  >();
  private reconnectAttempts = 0;
  /** Consecutive stream reopens caused by rejected subscribes; reset by an accepted one. */
  private subscribeReopens = 0;
  /** Consecutive stream reopens caused by `resync auth`; reset once an upstream streams. */
  private authReopens = 0;
  /** Channels already resynced on this connection; a `joined` resync for them is redundant. */
  private resyncedThisConnection = new Set<string>();
  private degradedChannels = new Set<string>();
  /** Number of `connected` events seen; above 1 means this connection follows a gap. */
  private connectionEpoch = 0;
  /** Why the next `connected` resyncs; the first cause of a gap wins. */
  private pendingResyncReason: ResyncReason | null = null;
  /** Last sign of life from the stream: the connect starting, its headers, or any message. */
  private lastMessageAt = 0;
  private lastErrorResyncAt = new Map<string, number>();
  private connectionState: WatchConnectionState = 'reconnecting';
  private statusListeners = new Set<() => void>();
  private detachListeners: (() => void) | null = null;

  private readonly hiddenGraceMs: number;
  private readonly watchdogMs: number;
  private readonly reconnectBaseMs: number;
  private readonly errorResyncThrottleMs: number;
  private readonly breadcrumb: WatchBreadcrumb;
  private readonly env: WatchManagerEnv | null;
  private readonly clock: WatchClock;
  private readonly subscriptions: SubscribeClient;
  private readonly rateLimitTimer: OneShotTimer;
  private readonly reconnectTimer: OneShotTimer;
  private readonly watchdogTimer: OneShotTimer;
  private readonly hiddenTimer: OneShotTimer;

  constructor(opts: WatchManagerOptions = {}) {
    this.clientId = crypto.randomUUID();
    this.hiddenGraceMs = opts.hiddenGraceMs ?? HIDDEN_GRACE_MS;
    this.watchdogMs = opts.watchdogMs ?? WATCHDOG_MS;
    this.reconnectBaseMs = opts.reconnectBaseMs ?? RECONNECT_BASE_DELAY_MS;
    this.errorResyncThrottleMs = opts.errorResyncThrottleMs ?? ERROR_RESYNC_THROTTLE_MS;
    this.breadcrumb = opts.breadcrumb ?? defaultBreadcrumb;
    this.env = opts.env ?? (typeof window !== 'undefined' ? { document, window } : null);
    this.clock = opts.clock ?? systemClock;
    this.rateLimitTimer = new OneShotTimer(this.clock);
    this.reconnectTimer = new OneShotTimer(this.clock);
    this.watchdogTimer = new OneShotTimer(this.clock);
    this.hiddenTimer = new OneShotTimer(this.clock);
    this.subscriptions = this.createSubscribeClient();

    if (opts.autoConnect ?? typeof window !== 'undefined') {
      void this.connect();
      this.attachListeners();
    }
  }

  // ─── Public API ──────────────────────────────────

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
    const typedCallback = callback as WatchSubscriber<unknown>;
    this.cancelPendingCleanup(channel);
    this.openChannel(channel, options).subscribers.add(typedCallback);

    return () => {
      this.cleanupTimers.set(channel, {
        timer: this.clock.setTimeout(() => {
          this.doUnsubscribe(channel, typedCallback);
          this.cleanupTimers.delete(channel);
        }, CLEANUP_DELAY_MS),
        callback: typedCallback,
      });
    };
  }

  /** Unsubscribe all channels, close the SSE connection, and clear all state. */
  disconnectAll(): void {
    for (const [channel] of this.channels) {
      void this.subscriptions.unsubscribe(channel);
    }
    this.channels.clear();
    this.pendingSubscriptions.clear();
    this.lastErrorResyncAt.clear();

    for (const { timer } of this.cleanupTimers.values()) {
      this.clock.clearTimeout(timer);
    }
    this.cleanupTimers.clear();

    this.closeStream();
    this.rateLimitTimer.clear();
    this.reconnectTimer.clear();
    this.hiddenTimer.clear();

    this.detachListeners?.();
    this.detachListeners = null;
  }

  /** Number of active watch channels. */
  getConnectionCount(): number {
    return this.channels.size;
  }

  /** Listen for connection state changes (for `useSyncExternalStore`). */
  subscribeStatus = (listener: () => void): (() => void) => {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  };

  getConnectionState = (): WatchConnectionState => this.connectionState;

  /** Debug snapshot of connection state. Accessible via `window.__watchStatus()`. */
  getStatus() {
    return {
      clientId: this.clientId,
      connected: this.isConnected,
      state: this.connectionState,
      channels: Array.from(this.channels.keys()),
      subscriberCounts: Object.fromEntries(
        Array.from(this.channels.entries()).map(([k, v]) => [k, v.subscribers.size])
      ),
    };
  }

  /** Must match the server-side `WatchHub.buildWatchKey()` format exactly. */
  buildChannelKey(options: WatchOptions): string {
    return [
      options.resourceType,
      options.orgId ?? '',
      options.projectId ?? '',
      options.namespace ?? '',
      options.name ?? '',
      options.labelSelector ?? '',
      options.fieldSelector ?? '',
      options.userScoped ? 'user' : '', // 8th segment — must match WatchHub.buildWatchKey exactly
    ].join(':');
  }

  /** Drop a Strict Mode re-mount's stale callback; left in place it keeps the channel open. */
  private cancelPendingCleanup(channel: string): void {
    const pending = this.cleanupTimers.get(channel);
    if (!pending) return;
    this.clock.clearTimeout(pending.timer);
    this.channels.get(channel)?.subscribers.delete(pending.callback);
    this.cleanupTimers.delete(channel);
  }

  private openChannel(channel: string, options: WatchOptions): ChannelSubscription {
    const existing = this.channels.get(channel);
    if (existing) return existing;
    const created: ChannelSubscription = { subscribers: new Set(), watchOptions: options };
    this.channels.set(channel, created);
    if (this.isConnected) {
      void this.subscriptions.subscribe(options);
    } else {
      this.pendingSubscriptions.set(channel, options);
    }
    return created;
  }

  private doUnsubscribe(channel: string, callback: WatchSubscriber<unknown>): void {
    const sub = this.channels.get(channel);
    if (!sub) return;

    sub.subscribers.delete(callback);
    if (sub.subscribers.size > 0) return;

    this.channels.delete(channel);
    this.lastErrorResyncAt.delete(channel);
    this.degradedChannels.delete(channel);
    this.updateConnectionState();
    this.pendingSubscriptions.delete(channel);
    void this.subscriptions.unsubscribe(channel);
  }

  private resubscribeAll(): void {
    this.pendingSubscriptions.clear();
    for (const [channel, sub] of this.channels) {
      this.pendingSubscriptions.set(channel, sub.watchOptions);
    }
  }

  private createSubscribeClient(): SubscribeClient {
    return new SubscribeClient(
      {
        epoch: () => this.connectionEpoch,
        isConnected: () => this.isConnected,
        wants: (channel) => this.channels.has(channel),
        rejected: (epoch) => this.reopenAfterRejectedSubscribe(epoch),
        exhausted: () => this.reconnectNow('reconnect'),
        accepted: () => {
          this.subscribeReopens = 0;
        },
      },
      {
        clientId: this.clientId,
        clock: this.clock,
        reconnectBaseMs: this.reconnectBaseMs,
        breadcrumb: this.breadcrumb,
        channelKey: (options) => this.buildChannelKey(options),
      }
    );
  }

  // ─── SSE Connection ──────────────────────────────

  /** No-op while a stream is opening or open; `reconnectNow` closes the current one first. */
  private async connect(): Promise<void> {
    if (this.controller) return;
    this.reconnectTimer.clear();
    this.rateLimitTimer.clear();

    const controller = new AbortController();
    this.controller = controller;
    this.armConnectTimeout(controller);

    try {
      const response = await fetch(`/api/watch/stream?cid=${this.clientId}`, {
        signal: controller.signal,
        headers: { Accept: 'text/event-stream' },
      });
      if (this.controller !== controller) return;
      if (response.status === 429) {
        this.waitOutRateLimit(response);
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      this.reconnectAttempts = 0;
      this.lastMessageAt = this.clock.now();
      this.armWatchdog();
      // Flush subscribes only on the hub's "connected" event: a POST that beats
      // registerClient() gets a 403.
      await this.readStream(response.body.getReader(), controller);
    } catch {
      // Reconnects below unless this stream was closed or replaced on purpose.
    }

    if (this.controller !== controller) return;
    this.controller = null;
    this.handleStreamLost('reconnect');
    this.scheduleReconnect();
  }

  /** A 429 waits out Retry-After without counting toward the backoff. */
  private waitOutRateLimit(response: Response): void {
    noteRateLimitedResponse(response.headers);
    this.controller = null;
    this.watchdogTimer.clear();
    this.rateLimitTimer.start(parseRetryAfter(response.headers.get('Retry-After')) * 1000, () => {
      void this.connect();
    });
  }

  /** Read the SSE byte stream, parse messages, and dispatch to handlers. */
  private async readStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    controller: AbortController
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (this.controller === controller) {
      const { done, value } = await reader.read();
      if (done) return;

      const { frames, rest } = splitSseFrames(buffer + decoder.decode(value, { stream: true }));
      buffer = rest;
      for (const frame of frames) {
        if (this.controller !== controller) return;
        this.handleFrame(frame);
      }
    }
  }

  private closeStream(): void {
    const controller = this.controller;
    this.controller = null;
    controller?.abort();
    this.watchdogTimer.clear();
    this.isConnected = false;
  }

  private handleStreamLost(reason: ResyncReason): void {
    this.isConnected = false;
    this.subscriptions.reset();
    // The hub repeats `degraded` to a client that resubscribes to an upstream
    // still in backoff, so the new connection starts from a clean slate.
    this.degradedChannels.clear();
    this.watchdogTimer.clear();
    this.pendingResyncReason ??= reason;
    this.resubscribeAll();
    this.setConnectionState('reconnecting');
  }

  // While a 429's Retry-After is pending its timer reconnects; jumping ahead
  // would only earn another 429.
  private reconnectNow(reason: ResyncReason): void {
    if (this.rateLimitTimer.pending) return;
    this.closeStream();
    this.handleStreamLost(reason);
    this.reconnectAttempts = 0;
    void this.connect();
  }

  /** Jittered backoff capped at {@link RECONNECT_MAX_DELAY_MS}; never gives up. */
  private scheduleReconnect(
    delay = jitteredBackoff(this.reconnectBaseMs, this.reconnectAttempts++)
  ): void {
    this.reconnectTimer.start(delay, () => {
      void this.connect();
    });
  }

  // A proxy can accept the connection and never send headers; abort such a
  // connect after the watchdog window so it reconnects with backoff.
  private armConnectTimeout(controller: AbortController): void {
    this.lastMessageAt = this.clock.now();
    this.watchdogTimer.start(this.watchdogMs, () => {
      this.breadcrumb('watch connect timed out', { waitedMs: this.watchdogMs }, 'warn');
      controller.abort();
    });
  }

  private armWatchdog(): void {
    this.watchdogTimer.start(this.watchdogMs, () => {
      this.breadcrumb('watch watchdog tripped', {
        silentMs: this.clock.now() - this.lastMessageAt,
      });
      this.reconnectNow('reconnect');
    });
  }

  private handleFrame(raw: string): void {
    // Any message, heartbeats included, proves the stream is alive.
    this.lastMessageAt = this.clock.now();
    this.armWatchdog();

    const message = parseHubMessage(raw);
    if (message) this.handleHubMessage(message);
  }

  private handleHubMessage(message: HubMessage): void {
    switch (message.event) {
      case 'connected':
        this.handleConnected();
        break;
      case 'watch':
        this.handleWatch(message.channel, { type: message.type, object: message.object });
        break;
      case 'watch-error':
        this.handleWatchError(message.channel, message.payload);
        break;
      case 'resync':
        this.handleHubResync(message.channel, message.payload);
        break;
      case 'reconnect':
        // The pod is shutting down; move to another one now.
        this.reconnectNow('reconnect');
        break;
      case 'subscribe-failed':
        // A relayed subscribe failed on the pod that holds this stream.
        this.reopenAfterRejectedSubscribe(this.connectionEpoch);
        break;
      case 'subscribed':
        // The pod holding this stream applied a subscribe, local or relayed.
        this.subscribeReopens = 0;
        break;
      // heartbeat — no action needed
    }
  }

  private handleConnected(): void {
    this.isConnected = true;
    this.connectionEpoch++;
    this.resyncedThisConnection.clear();

    for (const opts of this.pendingSubscriptions.values()) {
      void this.subscriptions.subscribe(opts);
    }
    this.pendingSubscriptions.clear();

    const reason = this.pendingResyncReason ?? 'reconnect';
    this.pendingResyncReason = null;
    if (this.connectionEpoch > 1) {
      this.breadcrumb('watch reconnected', { reason, channels: this.channels.size });
      this.resyncAll(reason);
    }
    this.updateConnectionState();
  }

  private handleWatch(channel: string, event: WatchEvent<unknown>): void {
    const sub = this.channels.get(channel);
    if (!sub) return;
    // An upstream accepted the token this stream brought.
    this.authReopens = 0;
    this.dispatch(sub, event);
  }

  private handleWatchError(channel: string, payload: Record<string, unknown>): void {
    const sub = this.channels.get(channel);
    if (!sub) return;
    const now = this.clock.now();
    const last = this.lastErrorResyncAt.get(channel);
    if (last !== undefined && now - last < this.errorResyncThrottleMs) return;
    this.lastErrorResyncAt.set(channel, now);
    this.dispatch(sub, { type: 'ERROR', object: payload });
  }

  /** A subscriber that throws is recorded and skipped so it cannot starve the others. */
  private dispatch(sub: ChannelSubscription, event: WatchEvent<unknown>): void {
    for (const subscriber of Array.from(sub.subscribers)) {
      try {
        subscriber(event);
      } catch (error) {
        this.breadcrumb(
          'watch subscriber threw',
          {
            resourceType: sub.watchOptions.resourceType,
            eventType: event.type,
            error: error instanceof Error ? error.message : String(error),
          },
          'error'
        );
      }
    }
  }

  private resyncAll(reason: ResyncReason): void {
    const event: WatchEvent<unknown> = { type: 'RESYNC', object: { reason } };
    this.breadcrumb('watch resync', { reason, channels: this.channels.size });
    for (const [channel, sub] of this.channels) {
      this.resyncedThisConnection.add(channel);
      this.dispatch(sub, event);
    }
  }

  // `auth` reopens the stream to bring the hub a fresh token. A `joined` for a
  // channel already resynced on this connection is dropped: refetch once, not twice.
  private handleHubResync(channel: string, payload: ResyncPayload): void {
    const sub = this.channels.get(channel);
    if (!sub) return;
    const { reason } = payload;

    if (reason === 'auth') {
      this.reopenAfterAuth(this.connectionEpoch);
      return;
    }
    if (reason === 'joined' && this.resyncedThisConnection.has(channel)) return;

    if (reason === 'degraded') this.degradedChannels.add(channel);
    if (reason === 'recovered') this.degradedChannels.delete(channel);
    this.updateConnectionState();

    this.resyncedThisConnection.add(channel);
    this.breadcrumb('watch resync', { reason, channel });
    this.dispatch(sub, {
      type: 'RESYNC',
      object: payload.degraded ? { reason, degraded: true } : { reason },
    });
  }

  private updateConnectionState(): void {
    if (!this.isConnected) return;
    this.setConnectionState(this.degradedChannels.size > 0 ? 'degraded' : 'live');
  }

  private setConnectionState(state: WatchConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    for (const listener of Array.from(this.statusListeners)) {
      listener();
    }
  }

  /** Once per connection; repeats back off so a client routed to the wrong pod does not spin. */
  private reopenAfterRejectedSubscribe(epoch: number): void {
    if (epoch !== this.connectionEpoch || !this.isConnected) return;
    this.reopenStream(this.subscribeReopens++, 'reconnect');
  }

  /** Once per connection; a token the upstream keeps rejecting backs off instead of looping. */
  private reopenAfterAuth(epoch: number): void {
    if (epoch !== this.connectionEpoch || !this.isConnected) return;
    this.reopenStream(this.authReopens++, 'auth');
  }

  private reopenStream(priorReopens: number, reason: ResyncReason): void {
    this.closeStream();
    this.handleStreamLost(reason);
    if (priorReopens === 0) {
      void this.connect();
    } else {
      this.scheduleReconnect(jitteredBackoff(this.reconnectBaseMs, priorReopens - 1));
    }
  }

  // A connect younger than the watchdog window is not stale: restarting it
  // would only start the wait over.
  private isStale(): boolean {
    return this.controller !== null && this.clock.now() - this.lastMessageAt > this.watchdogMs;
  }

  private closeWhileHidden(): void {
    this.reconnectTimer.clear();
    this.rateLimitTimer.clear();
    this.closeStream();
    this.handleStreamLost('visible');
  }

  private onVisibilityChange(hidden: boolean): void {
    if (hidden) {
      this.hiddenTimer.start(this.hiddenGraceMs, () => this.closeWhileHidden());
      return;
    }
    this.hiddenTimer.clear();
    if (!this.controller || this.isStale()) this.reconnectNow('visible');
  }

  private onOnline(hidden: boolean): void {
    if (hidden && !this.controller) return;
    if (!this.controller || this.isStale()) this.reconnectNow('online');
  }

  // Timers freeze while a laptop sleeps, so on tab return or `online` a closed
  // or stale stream reconnects at once instead of waiting for the watchdog.
  private attachListeners(): void {
    if (this.detachListeners || !this.env) return;
    const { document: doc, window: win } = this.env;
    const onVisibility = () => this.onVisibilityChange(doc.hidden);
    const onOnline = () => this.onOnline(doc.hidden);

    doc.addEventListener('visibilitychange', onVisibility);
    win.addEventListener('online', onOnline);
    this.detachListeners = () => {
      doc.removeEventListener('visibilitychange', onVisibility);
      win.removeEventListener('online', onOnline);
    };
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
  const win = window as unknown as { __watchManager?: WatchManager };
  win.__watchManager ??= new WatchManager();
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
