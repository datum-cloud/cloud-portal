import {
  buildChannelKey,
  buildUpstreamUrl,
  buildWatchKey,
  buildWatchUrl,
  watchKeyForChannel,
} from './watch-hub.keys';
import type {
  RegisterClientResult,
  UpstreamState,
  WatchClient,
  UpstreamWatch,
  WatchResyncReason,
  WatchSubscribeRequest,
  WatchSSEEvent,
  WatchStats,
} from './watch-hub.types';
import { parseWatchEvent, extractResourceVersion } from '@/modules/watch/watch.parser';
import { countWatchResync, countWatchUpstreamState } from '@/server/observability/watch-metrics';
import type { SSEStreamingApi } from 'hono/streaming';

/** Max upstream reconnection attempts before broadcasting an error to clients. */
const MAX_RECONNECT_ATTEMPTS = 5;
/** Base delay for exponential backoff on upstream reconnection (doubles each attempt). */
const BASE_RECONNECT_DELAY = 1000;
/**
 * How long a streamed response may sit with no bytes written before the
 * runtime closes it. Measured at ~12s against this stack (Bun + Hono
 * `streamSSE`), identically on `react-router-hono-server` v3 and v4, and not
 * affected by `Bun.serve`'s `idleTimeout`. Treated as an empirical ceiling:
 * anything the hub does to keep a connection open must happen well inside it.
 */
export const SSE_IDLE_TIMEOUT_MS = 12000;

/**
 * Heartbeat cadence. Keep it at or under half of {@link SSE_IDLE_TIMEOUT_MS}.
 *
 * A heartbeat slower than the idle close never fires: the connection drops,
 * `stream.onAbort` evicts the client, and a `subscribe` arriving before the
 * browser reconnects fails `isClientOwnedBy` with a 403.
 *
 * Measured against a local production build, holding one idle connection:
 * no writes dropped at 12s, 8000ms still dropped at 24s, while 5000ms and
 * 3000ms both held for 75s. Sitting just under the ceiling is not enough —
 * hence the half-interval rule, which `watch-hub.test.ts` enforces.
 */
export const HEARTBEAT_INTERVAL_MS = 5000;
/** Delay before closing an upstream K8s connection after the last subscriber leaves. */
const UPSTREAM_GRACE_PERIOD_MS = 10000;
/** Retry cadence for an upstream that has used up its fast reconnect attempts. */
export const UPSTREAM_BACKOFF_RETRY_MS = 30_000;
/** Reset attempts after streaming this long, not on connect, so ERROR-then-end loops back off. */
export const UPSTREAM_HEALTHY_AFTER_MS = 60_000;
/** A third of `OWNER_TTL_SECONDS`, so an ownership key survives two missed refreshes. */
export const OWNER_REFRESH_MS = 20_000;
/** Maximum number of concurrent SSE clients the WatchHub will accept. */
const MAX_CLIENTS = 1000;
/** Maximum number of watch subscriptions a single client can hold. */
const MAX_SUBSCRIPTIONS_PER_CLIENT = 50;
/** Time (ms) after which an idle client with no subscriptions is pruned. */
const IDLE_CLIENT_TIMEOUT_MS = 120000;

export interface WatchOwnerRegistry {
  registerOwner(cid: string, userId: string): Promise<void>;
  refreshOwners(owners: Iterable<[cid: string, userId: string]>): Promise<void>;
  releaseOwner(cid: string): Promise<void>;
}

export { buildChannelKey, buildWatchKey } from './watch-hub.keys';

/**
 * Server-side watch multiplexer that manages upstream K8s Watch connections
 * and fans out events to browser clients via SSE.
 *
 * Instead of each browser tab opening N direct watch connections (one per
 * resource), the WatchHub maintains a single upstream K8s connection per
 * unique watch key and broadcasts events to all subscribed SSE clients.
 * This reduces K8s API load and avoids HTTP/1.1 connection starvation
 * on the browser side.
 *
 * Architecture:
 * ```
 *   Browser Tab A ──SSE──┐
 *   Browser Tab B ──SSE──┤── WatchHub ──fetch──▶ K8s Watch (domains)
 *   Browser Tab C ──SSE──┘              ──fetch──▶ K8s Watch (dnszones)
 * ```
 *
 * Key behaviours:
 * - **Deduplication**: One user's clients watching the same resource share one upstream.
 * - **Grace period**: Upstream stays alive for {@link UPSTREAM_GRACE_PERIOD_MS} after
 *   the last subscriber leaves, avoiding teardown/setup churn during navigation.
 * - **ResourceVersion tracking**: Tracks the latest resourceVersion per upstream so
 *   reconnections resume from where they left off (gap-free).
 * - **410 Gone handling**: Resets resourceVersion, reconnects, and sends `resync`
 *   (`expired`) once streaming again, since an rv=0 replay never sends deletes.
 * - **Resync**: Tells clients when a channel lost continuity so they refetch
 *   (see `WatchResyncReason`).
 * - **Token affinity**: Each upstream uses its own user's latest token.
 * - **Heartbeat**: Sends a heartbeat every {@link HEARTBEAT_INTERVAL_MS} to keep
 *   SSE connections alive through proxies and load balancers.
 *
 * Instantiated as a singleton via {@link watchHub} and shut down on SIGTERM/SIGINT.
 */
export class WatchHub {
  private clients = new Map<string, WatchClient>();
  private upstreams = new Map<string, UpstreamWatch>();
  /** Maps watchKey → Set of clientIds subscribed to that channel. */
  private subscriptions = new Map<string, Set<string>>();
  private graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private userTokens = new Map<string, string>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private ownerRegistry: WatchOwnerRegistry | null = null;
  private lastOwnerRefresh = Date.now();

  constructor() {
    this.startHeartbeat();
  }

  setOwnerRegistry(registry: WatchOwnerRegistry | null): void {
    this.ownerRegistry = registry;
  }

  // ─── Client Lifecycle ────────────────────────────

  /**
   * Register an SSE client and send the initial `connected` event.
   * @returns `accepted`, `full` when the server is at capacity, or `conflict`
   * when another user already holds a stream with this ID.
   */
  registerClient(client: WatchClient): RegisterClientResult {
    // Never replace another user's stream: it would hand over subscriptions and the owner key.
    const existing = this.clients.get(client.id);
    if (existing && existing.userId !== client.userId) return 'conflict';
    if (existing) this.dropClient(existing);

    if (this.clients.size >= MAX_CLIENTS) {
      // A key left from an earlier stream on this pod would route subscribes
      // here for a client this pod turned away.
      void this.ownerRegistry?.releaseOwner(client.id);
      return 'full';
    }

    this.clients.set(client.id, client);
    this.userTokens.set(client.userId, client.token);
    void this.ownerRegistry?.registerOwner(client.id, client.userId);
    this.sendToClient(client.id, {
      event: 'connected',
      data: { clientId: client.id },
    });
    return 'accepted';
  }

  /** No-op unless `stream` is current, so a replaced stream's abort cannot evict the new one. */
  removeClient(clientId: string, stream: SSEStreamingApi): void {
    const client = this.clients.get(clientId);
    if (!client || client.stream !== stream) return;
    this.dropClient(client);
    void this.ownerRegistry?.releaseOwner(clientId);
  }

  private dropClient(client: WatchClient): void {
    const clientId = client.id;
    // Unsubscribe from all channels
    for (const watchKey of client.subscriptions) {
      this.removeSubscription(clientId, watchKey);
    }

    this.clients.delete(clientId);

    const userHasClients = Array.from(this.clients.values()).some(
      (c) => c.userId === client.userId
    );
    if (!userHasClients) this.userTokens.delete(client.userId);
  }

  /** Update a client's auth token (called on every subscribe to keep tokens fresh). */
  updateClientToken(clientId: string, token: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    client.token = token;
    this.userTokens.set(client.userId, token);
  }

  /**
   * Update the auth token for all SSE clients owned by a specific user.
   * Called after a successful token refresh so that upstream reconnections
   * use the newly rotated access token instead of the stale one.
   */
  updateTokensByUserId(userId: string, accessToken: string): void {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        client.token = accessToken;
        this.userTokens.set(userId, accessToken);
      }
    }
  }

  hasClient(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  /** Check whether a client belongs to the given user (for ownership validation). */
  isClientOwnedBy(clientId: string, userId: string): boolean {
    const client = this.clients.get(clientId);
    return client?.userId === userId;
  }

  // ─── Subscribe / Unsubscribe ─────────────────────

  /**
   * Subscribe a client to a K8s resource watch channel.
   * Starts an upstream K8s connection if one isn't already running for this channel.
   * @returns The channel name for the subscription.
   */
  async subscribe(req: WatchSubscribeRequest): Promise<string> {
    const client = this.clients.get(req.clientId);
    if (!client) throw new Error('Client not registered');
    const channel = buildChannelKey(req);
    const watchKey = buildWatchKey(req, client.userId);

    if (client.subscriptions.size >= MAX_SUBSCRIPTIONS_PER_CLIENT) {
      throw new Error('Maximum subscriptions per client exceeded');
    }

    // Built before any state changes so a rejected request leaves no orphan subscription.
    const upstream = this.upstreams.get(watchKey);
    const url = upstream ? null : buildUpstreamUrl(req, client.userId);

    this.addSubscription(client, watchKey);

    // No replay: a late subscriber has missed events since its REST list.
    const joined =
      upstream !== undefined &&
      (upstream.state === 'streaming' || upstream.resourceVersion !== '0');
    if (url !== null) {
      await this.startUpstreamWatch(watchKey, channel, url, client.token, client.userId);
    } else if (upstream?.state === 'backoff' && upstream.reconnectTimer) {
      this.restartUpstream(upstream, client.token);
    }

    this.confirmSubscribe(req.clientId, channel, upstream?.state === 'backoff', joined);
    return channel;
  }

  private addSubscription(client: WatchClient, watchKey: string): void {
    const graceTimer = this.graceTimers.get(watchKey);
    if (graceTimer) {
      clearTimeout(graceTimer);
      this.graceTimers.delete(watchKey);
    }

    client.subscriptions.add(watchKey);
    const subs = this.subscriptions.get(watchKey) ?? new Set<string>();
    subs.add(client.id);
    this.subscriptions.set(watchKey, subs);
  }

  private confirmSubscribe(
    clientId: string,
    channel: string,
    degraded: boolean,
    joined: boolean
  ): void {
    this.sendToClient(clientId, { event: 'subscribed', data: { channel } });
    if (degraded) {
      // This client missed the broadcast `degraded`; it implies `joined`.
      countWatchResync('degraded');
      this.sendToClient(clientId, {
        event: 'resync',
        data: { channel, reason: 'degraded', degraded: true },
      });
    } else if (joined) {
      countWatchResync('joined');
      this.sendToClient(clientId, { event: 'resync', data: { channel, reason: 'joined' } });
    }
  }

  /** Unsubscribe a client from a watch channel. Starts a grace period if no subscribers remain. */
  unsubscribe(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const watchKey = watchKeyForChannel(channel, client.userId);
    this.removeSubscription(clientId, watchKey);
    client.subscriptions.delete(watchKey);
    this.sendToClient(clientId, {
      event: 'unsubscribed',
      data: { channel },
    });
  }

  /** The relaying pod already answered 202, so the stream is the only way back. */
  sendSubscribeFailed(clientId: string, channel: string, reason: string): void {
    this.sendToClient(clientId, { event: 'subscribe-failed', data: { channel, reason } });
  }

  // ─── Internal: Subscription Management ───────────

  private removeSubscription(clientId: string, watchKey: string): void {
    const subs = this.subscriptions.get(watchKey);
    if (!subs) return;

    subs.delete(clientId);

    if (subs.size === 0) {
      this.subscriptions.delete(watchKey);
      // Grace period before closing upstream
      this.graceTimers.set(
        watchKey,
        setTimeout(() => {
          this.closeUpstream(watchKey);
          this.graceTimers.delete(watchKey);
        }, UPSTREAM_GRACE_PERIOD_MS)
      );
    }
  }

  // ─── Internal: Upstream K8s Watch ────────────────

  private async startUpstreamWatch(
    watchKey: string,
    channel: string,
    url: string,
    token: string,
    userId: string
  ): Promise<void> {
    const controller = new AbortController();
    const upstream: UpstreamWatch = {
      key: watchKey,
      channel,
      url,
      controller,
      resourceVersion: '0',
      lastActivity: Date.now(),
      reconnectAttempts: 0,
      state: 'connecting',
      userId,
    };

    this.upstreams.set(watchKey, upstream);
    countWatchUpstreamState(upstream.state);

    this.connectUpstream(upstream, token);
  }

  private async connectUpstream(upstream: UpstreamWatch, token: string): Promise<void> {
    if (upstream.state !== 'backoff') this.setUpstreamState(upstream, 'connecting');

    try {
      const response = await fetch(buildWatchUrl(upstream), {
        signal: upstream.controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      const body = await this.acceptResponse(upstream, response, token);
      if (!body) return;

      this.onStreamOpen(upstream);
      const end = await this.readStream(upstream, body, token);
      clearTimeout(upstream.healthyTimer);
      upstream.healthyTimer = undefined;
      if (end !== 'expired') this.onStreamEnd(upstream, token, end === 'error');
    } catch (err) {
      clearTimeout(upstream.healthyTimer);
      upstream.healthyTimer = undefined;
      if ((err as Error).name === 'AbortError') return; // Intentional close
      if (!this.isCurrent(upstream)) return;
      this.handleUpstreamFailure(upstream, token);
    }
  }

  private async acceptResponse(
    upstream: UpstreamWatch,
    response: Response,
    token: string
  ): Promise<ReadableStream<Uint8Array> | null> {
    if (response.status === 401) {
      await response.body?.cancel().catch(() => {});
      this.handleUnauthorized(upstream, token);
      return null;
    }

    // 403 is RBAC, not a stale token: back off instead of making clients reopen in a loop.
    if (response.status === 403) {
      await response.body?.cancel().catch(() => {});
      if (this.isCurrent(upstream)) this.enterBackoff(upstream, token);
      return null;
    }

    if (!response.ok || !response.body) {
      const bodyText = response.body ? await response.text().catch(() => '') : '';
      throw new Error(
        `Upstream watch failed: ${response.status} key=${upstream.key} body=${bodyText.slice(0, 500)}`
      );
    }
    return response.body;
  }

  private onStreamOpen(upstream: UpstreamWatch): void {
    const recovered = upstream.state === 'backoff';
    const owed = upstream.pendingResync;
    this.setUpstreamState(upstream, 'streaming');
    upstream.authRetried = false;
    clearTimeout(upstream.healthyTimer);
    upstream.healthyTimer = setTimeout(() => {
      upstream.healthyTimer = undefined;
      upstream.reconnectAttempts = 0;
    }, UPSTREAM_HEALTHY_AFTER_MS);
    upstream.pendingResync = undefined;
    upstream.lastActivity = Date.now();
    // `recovered` also covers an expiry that happened while degraded.
    if (recovered) this.broadcastResync(upstream, 'recovered');
    else if (owed) this.broadcastResync(upstream, owed);
  }

  private async readStream(
    upstream: UpstreamWatch,
    body: ReadableStream<Uint8Array>,
    token: string
  ): Promise<'ok' | 'error' | 'expired'> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let sawError = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) return sawError ? 'error' : 'ok';

      upstream.lastActivity = Date.now();
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const result = this.processLine(upstream, line);
        if (result === 'expired') {
          void reader.cancel().catch(() => {});
          this.onExpired(upstream, token);
          return 'expired';
        }
        if (result === 'error') sawError = true;
      }
    }
  }

  private processLine(upstream: UpstreamWatch, line: string): 'event' | 'error' | 'expired' | null {
    const event = parseWatchEvent(line);
    if (!event) return null;

    if (event.type === 'ERROR') {
      const status = event.object as { code?: number; reason?: string; message?: string };
      if (status.code === 410 || status.reason === 'Expired') return 'expired';
      this.broadcastToChannel(upstream.key, {
        event: 'watch-error',
        data: {
          channel: upstream.channel,
          code: status.code,
          reason: status.reason,
          message: status.message,
        },
      });
      return 'error';
    }

    const rv = extractResourceVersion(event.object);
    if (rv) upstream.resourceVersion = rv;
    this.broadcastToChannel(upstream.key, {
      event: 'watch',
      data: {
        channel: upstream.channel,
        type: event.type,
        object: event.object,
        resourceVersion: rv,
      },
    });
    return 'event';
  }

  /** An rv 0 replay never sends deletes from the gap, so clients get `resync` once it streams. */
  private onExpired(upstream: UpstreamWatch, token: string): void {
    upstream.resourceVersion = '0';
    upstream.pendingResync = 'expired';
    clearTimeout(upstream.healthyTimer);
    upstream.healthyTimer = undefined;
    if (upstream.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.scheduleUpstreamReconnect(upstream, token, 100);
    } else {
      this.enterBackoff(upstream, token);
    }
  }

  /**
   * With no subscribers, close now so a subscribe in the grace window starts a
   * live upstream. An end after an ERROR is the apiserver giving up: a failure.
   */
  private onStreamEnd(upstream: UpstreamWatch, token: string, sawError: boolean): void {
    if (!this.isCurrent(upstream)) return;
    if (!this.subscriptions.has(upstream.key)) {
      this.closeUpstream(upstream.key);
      return;
    }
    if (sawError) this.handleUpstreamFailure(upstream, token);
    else this.scheduleUpstreamReconnect(upstream, token, 1000);
  }

  private handleUpstreamFailure(upstream: UpstreamWatch, token: string): void {
    if (upstream.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = BASE_RECONNECT_DELAY * Math.pow(2, upstream.reconnectAttempts);
      this.scheduleUpstreamReconnect(upstream, token, delay);
      return;
    }

    this.enterBackoff(upstream, token);
  }

  private enterBackoff(upstream: UpstreamWatch, token: string): void {
    if (!this.subscriptions.has(upstream.key)) {
      this.closeUpstream(upstream.key);
      return;
    }

    if (upstream.state !== 'backoff') {
      this.setUpstreamState(upstream, 'backoff');
      // Clients from before `resync` only understand `watch-error`.
      this.broadcastToChannel(upstream.key, {
        event: 'watch-error',
        data: {
          channel: upstream.channel,
          message: 'Max reconnection attempts exceeded',
        },
      });
      this.broadcastResync(upstream, 'degraded');
    }
    this.scheduleUpstreamReconnect(upstream, token, UPSTREAM_BACKOFF_RETRY_MS);
  }

  /** Retry once with the user's newer token if any; otherwise clients reopen with a fresh one. */
  private handleUnauthorized(upstream: UpstreamWatch, token: string): void {
    if (!this.isCurrent(upstream)) return;
    const latest = this.userTokens.get(upstream.userId);
    if (latest && latest !== token && !upstream.authRetried) {
      upstream.authRetried = true;
      this.restartUpstream(upstream, latest);
      return;
    }
    this.broadcastResync(upstream, 'auth');
    this.dropChannel(upstream.key);
    this.closeUpstream(upstream.key);
  }

  private dropChannel(watchKey: string): void {
    for (const clientId of this.subscriptions.get(watchKey) ?? []) {
      this.clients.get(clientId)?.subscriptions.delete(watchKey);
    }
    this.subscriptions.delete(watchKey);
  }

  private setUpstreamState(upstream: UpstreamWatch, state: UpstreamState): void {
    if (upstream.state === state) return;
    upstream.state = state;
    countWatchUpstreamState(state);
  }

  private isCurrent(upstream: UpstreamWatch): boolean {
    return upstream.state !== 'closed' && this.upstreams.get(upstream.key) === upstream;
  }

  private restartUpstream(upstream: UpstreamWatch, token: string): void {
    clearTimeout(upstream.reconnectTimer);
    upstream.reconnectTimer = undefined;
    upstream.controller = new AbortController();
    void this.connectUpstream(upstream, token);
  }

  private scheduleUpstreamReconnect(upstream: UpstreamWatch, token: string, delayMs: number): void {
    upstream.reconnectAttempts++;
    clearTimeout(upstream.reconnectTimer);
    upstream.reconnectTimer = setTimeout(() => {
      upstream.reconnectTimer = undefined;
      if (!this.isCurrent(upstream)) return;
      const freshToken = this.userTokens.get(upstream.userId) ?? token;
      upstream.controller = new AbortController();
      void this.connectUpstream(upstream, freshToken);
    }, delayMs);
  }

  private closeUpstream(watchKey: string): void {
    const graceTimer = this.graceTimers.get(watchKey);
    if (graceTimer) {
      clearTimeout(graceTimer);
      this.graceTimers.delete(watchKey);
    }

    const upstream = this.upstreams.get(watchKey);
    if (upstream) {
      this.setUpstreamState(upstream, 'closed');
      clearTimeout(upstream.reconnectTimer);
      upstream.reconnectTimer = undefined;
      clearTimeout(upstream.healthyTimer);
      upstream.healthyTimer = undefined;
      upstream.controller.abort();
      this.upstreams.delete(watchKey);
    }
  }

  // ─── Internal: SSE Broadcast ─────────────────────

  private sendToClient(clientId: string, event: WatchSSEEvent): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      client.stream.writeSSE({
        event: event.event,
        data: JSON.stringify(event.data),
      });
      client.lastActivity = Date.now();
    } catch {
      // Client disconnected — will be cleaned up
      this.removeClient(clientId, client.stream);
    }
  }

  private broadcastResync(upstream: UpstreamWatch, reason: WatchResyncReason): void {
    countWatchResync(reason);
    this.broadcastToChannel(upstream.key, {
      event: 'resync',
      data:
        reason === 'degraded'
          ? { channel: upstream.channel, reason, degraded: true }
          : { channel: upstream.channel, reason },
    });
  }

  private broadcastToChannel(watchKey: string, event: WatchSSEEvent): void {
    const subs = this.subscriptions.get(watchKey);
    if (!subs) return;

    // Snapshot to avoid mutation during iteration (sendToClient may remove clients)
    for (const clientId of Array.from(subs)) {
      this.sendToClient(clientId, event);
    }
  }

  // ─── Internal: Heartbeat ─────────────────────────

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const ts = Date.now();

      for (const [clientId, client] of this.clients) {
        // Prune idle clients with no active subscriptions
        if (client.subscriptions.size === 0 && ts - client.lastActivity > IDLE_CLIENT_TIMEOUT_MS) {
          this.removeClient(clientId, client.stream);
          continue;
        }

        this.sendToClient(clientId, {
          event: 'heartbeat',
          data: { ts },
        });
      }

      if (this.ownerRegistry && ts - this.lastOwnerRefresh >= OWNER_REFRESH_MS) {
        this.lastOwnerRefresh = ts;
        void this.ownerRegistry.refreshOwners(
          Array.from(this.clients.values(), (c): [string, string] => [c.id, c.userId])
        );
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  // ─── Stats (for debugging / monitoring) ──────────

  /** Return connection stats for the debug `/api/watch/stats` endpoint. */
  getStats(): WatchStats {
    return {
      clients: this.clients.size,
      upstreams: this.upstreams.size,
      subscriptions: Object.fromEntries(
        Array.from(this.subscriptions.entries()).map(([k, v]) => [k, v.size])
      ),
    };
  }

  // ─── Shutdown ────────────────────────────────────

  /**
   * Gracefully shut down all upstreams, timers, and client connections.
   * Clients are told to reconnect so they move pods without waiting out backoff.
   */
  shutdown(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    for (const clientId of Array.from(this.clients.keys())) {
      this.sendToClient(clientId, { event: 'reconnect', data: {} });
      void this.ownerRegistry?.releaseOwner(clientId);
    }
    for (const watchKey of Array.from(this.upstreams.keys())) this.closeUpstream(watchKey);
    for (const timer of this.graceTimers.values()) clearTimeout(timer);
    this.clients.clear();
    this.upstreams.clear();
    this.subscriptions.clear();
    this.graceTimers.clear();
    this.userTokens.clear();
  }
}

/**
 * Singleton WatchHub instance.
 * Initialised once at server start; shut down on SIGTERM/SIGINT via `entry.ts`.
 */
export const watchHub = new WatchHub();
