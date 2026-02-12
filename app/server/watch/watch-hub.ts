import type {
  WatchClient,
  UpstreamWatch,
  WatchSubscribeRequest,
  WatchSSEEvent,
  WatchStats,
} from './watch-hub.types';
import { parseWatchEvent, extractResourceVersion } from '@/modules/watch/watch.parser';
import { env } from '@/utils/env/env.server';

/** Max upstream reconnection attempts before broadcasting an error to clients. */
const MAX_RECONNECT_ATTEMPTS = 5;
/** Base delay for exponential backoff on upstream reconnection (doubles each attempt). */
const BASE_RECONNECT_DELAY = 1000;
/** Interval between heartbeat SSE events sent to all connected clients (ms). */
const HEARTBEAT_INTERVAL_MS = 30000;
/** Delay before closing an upstream K8s connection after the last subscriber leaves. */
const UPSTREAM_GRACE_PERIOD_MS = 10000;
/** Maximum number of concurrent SSE clients the WatchHub will accept. */
const MAX_CLIENTS = 1000;
/** Maximum number of watch subscriptions a single client can hold. */
const MAX_SUBSCRIPTIONS_PER_CLIENT = 50;
/** Time (ms) after which an idle client with no subscriptions is pruned. */
const IDLE_CLIENT_TIMEOUT_MS = 120000;

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
 * - **Deduplication**: Multiple clients watching the same resource share one upstream.
 * - **Grace period**: Upstream stays alive for {@link UPSTREAM_GRACE_PERIOD_MS} after
 *   the last subscriber leaves, avoiding teardown/setup churn during navigation.
 * - **ResourceVersion tracking**: Tracks the latest resourceVersion per upstream so
 *   reconnections resume from where they left off (gap-free).
 * - **410 Gone handling**: Silently resets resourceVersion and reconnects without
 *   notifying clients (the server handles this internally).
 * - **Token affinity**: On each subscribe, the client's token is updated. On upstream
 *   reconnections, the freshest token from the upstream creator is preferred.
 * - **Heartbeat**: Sends a heartbeat every {@link HEARTBEAT_INTERVAL_MS} to keep
 *   SSE connections alive through proxies and load balancers.
 *
 * Instantiated as a singleton via {@link watchHub} and shut down on SIGTERM/SIGINT.
 */
class WatchHub {
  private clients = new Map<string, WatchClient>();
  private upstreams = new Map<string, UpstreamWatch>();
  /** Maps watchKey → Set of clientIds subscribed to that channel. */
  private subscriptions = new Map<string, Set<string>>();
  private graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeat();
  }

  // ─── Client Lifecycle ────────────────────────────

  /**
   * Register an SSE client and send the initial `connected` event.
   * @returns `true` if the client was accepted, `false` if the server is at capacity.
   */
  registerClient(client: WatchClient): boolean {
    if (this.clients.size >= MAX_CLIENTS) {
      return false;
    }

    this.clients.set(client.id, client);
    this.sendToClient(client.id, {
      event: 'connected',
      data: { clientId: client.id },
    });
    return true;
  }

  /** Remove a client and unsubscribe it from all channels. */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Unsubscribe from all channels
    for (const watchKey of client.subscriptions) {
      this.removeSubscription(clientId, watchKey);
    }

    this.clients.delete(clientId);
  }

  /** Update a client's auth token (called on every subscribe to keep tokens fresh). */
  updateClientToken(clientId: string, token: string): void {
    const client = this.clients.get(clientId);
    if (client) client.token = token;
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
   * @returns The watch key (channel name) for the subscription.
   */
  async subscribe(req: WatchSubscribeRequest): Promise<string> {
    const watchKey = this.buildWatchKey(req);
    const client = this.clients.get(req.clientId);
    if (!client) throw new Error('Client not registered');

    if (client.subscriptions.size >= MAX_SUBSCRIPTIONS_PER_CLIENT) {
      throw new Error('Maximum subscriptions per client exceeded');
    }

    // Cancel grace timer if upstream was about to close
    const graceTimer = this.graceTimers.get(watchKey);
    if (graceTimer) {
      clearTimeout(graceTimer);
      this.graceTimers.delete(watchKey);
    }

    // Add subscription
    client.subscriptions.add(watchKey);
    if (!this.subscriptions.has(watchKey)) {
      this.subscriptions.set(watchKey, new Set());
    }
    this.subscriptions.get(watchKey)!.add(req.clientId);

    // Start upstream if not running
    if (!this.upstreams.has(watchKey)) {
      const url = this.buildUpstreamUrl(req);
      await this.startUpstreamWatch(watchKey, url, client.token, client.userId);
    }

    this.sendToClient(req.clientId, {
      event: 'subscribed',
      data: { channel: watchKey },
    });

    return watchKey;
  }

  /** Unsubscribe a client from a watch channel. Starts a grace period if no subscribers remain. */
  unsubscribe(clientId: string, channel: string): void {
    this.removeSubscription(clientId, channel);

    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(channel);
      this.sendToClient(clientId, {
        event: 'unsubscribed',
        data: { channel },
      });
    }
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
    url: string,
    token: string,
    userId: string
  ): Promise<void> {
    const controller = new AbortController();
    const upstream: UpstreamWatch = {
      key: watchKey,
      url,
      controller,
      resourceVersion: '0',
      lastActivity: Date.now(),
      reconnectAttempts: 0,
      isConnecting: true,
      creatorUserId: userId,
    };

    this.upstreams.set(watchKey, upstream);

    this.connectUpstream(upstream, token);
  }

  private async connectUpstream(upstream: UpstreamWatch, token: string): Promise<void> {
    upstream.isConnecting = true;
    const separator = upstream.url.includes('?') ? '&' : '?';
    // Always include resourceVersion — K8s watch API (especially behind the
    // resourcemanager control-plane proxy) requires it to initialise the stream.
    const watchUrl = `${upstream.url}${separator}resourceVersion=${upstream.resourceVersion}`;

    try {
      const response = await fetch(watchUrl, {
        signal: upstream.controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(`Upstream watch failed: ${response.status}`);
      }

      upstream.isConnecting = false;
      upstream.reconnectAttempts = 0;
      upstream.lastActivity = Date.now();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        upstream.lastActivity = Date.now();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const event = parseWatchEvent(line);
          if (!event) continue;

          // Handle 410 Gone (resourceVersion expired)
          if (event.type === 'ERROR') {
            const status = event.object as { code?: number; reason?: string; message?: string };
            if (status.code === 410 || status.reason === 'Expired') {
              // Server handles reconnection internally — no need to notify clients
              upstream.resourceVersion = '0';
              reader.cancel();
              this.scheduleUpstreamReconnect(upstream, token, 100);
              return;
            }
            // Broadcast other errors
            this.broadcastToChannel(upstream.key, {
              event: 'watch-error',
              data: {
                channel: upstream.key,
                code: status.code,
                reason: status.reason,
                message: status.message,
              },
            });
            continue;
          }

          // Track resourceVersion
          const rv = extractResourceVersion(event.object);
          if (rv) upstream.resourceVersion = rv;

          // Fan-out to all subscribed clients
          this.broadcastToChannel(upstream.key, {
            event: 'watch',
            data: {
              channel: upstream.key,
              type: event.type,
              object: event.object,
              resourceVersion: rv,
            },
          });
        }
      }

      // Stream ended normally — reconnect if still subscribed
      if (this.subscriptions.has(upstream.key)) {
        this.scheduleUpstreamReconnect(upstream, token, 1000);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // Intentional close

      upstream.isConnecting = false;

      if (upstream.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = BASE_RECONNECT_DELAY * Math.pow(2, upstream.reconnectAttempts);
        this.scheduleUpstreamReconnect(upstream, token, delay);
      } else {
        // Max retries exceeded
        this.broadcastToChannel(upstream.key, {
          event: 'watch-error',
          data: {
            channel: upstream.key,
            message: 'Max reconnection attempts exceeded',
          },
        });
        this.closeUpstream(upstream.key);
      }
    }
  }

  private scheduleUpstreamReconnect(upstream: UpstreamWatch, token: string, delayMs: number): void {
    upstream.reconnectAttempts++;
    setTimeout(() => {
      if (!this.upstreams.has(upstream.key)) return; // Already closed
      // Use freshest token from any subscriber
      const freshToken = this.getFreshToken(upstream.key) ?? token;
      upstream.controller = new AbortController();
      this.connectUpstream(upstream, freshToken);
    }, delayMs);
  }

  /**
   * Get the freshest token for an upstream reconnection.
   * Prefers tokens from clients with the same userId as the upstream creator
   * to prevent cross-user token confusion.
   */
  private getFreshToken(watchKey: string): string | undefined {
    const subs = this.subscriptions.get(watchKey);
    if (!subs) return undefined;

    const upstream = this.upstreams.get(watchKey);
    const creatorUserId = upstream?.creatorUserId;
    let fallbackToken: string | undefined;

    for (const clientId of subs) {
      const client = this.clients.get(clientId);
      if (!client) continue;

      if (creatorUserId && client.userId === creatorUserId) {
        return client.token;
      }
      if (!fallbackToken) fallbackToken = client.token;
    }

    return fallbackToken;
  }

  private closeUpstream(watchKey: string): void {
    const upstream = this.upstreams.get(watchKey);
    if (upstream) {
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
      this.removeClient(clientId);
    }
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
          this.removeClient(clientId);
          continue;
        }

        this.sendToClient(clientId, {
          event: 'heartbeat',
          data: { ts },
        });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  // ─── Internal: URL Building ──────────────────────

  /**
   * Build a deterministic key for a watch subscription.
   * Must match the client-side `WatchManager.buildChannelKey()` format exactly
   * so that subscribe/unsubscribe channel names align.
   */
  private buildWatchKey(req: WatchSubscribeRequest): string {
    return [
      req.resourceType,
      req.orgId ?? '',
      req.projectId ?? '',
      req.namespace ?? '',
      req.name ?? '',
      req.labelSelector ?? '',
      req.fieldSelector ?? '',
    ].join(':');
  }

  /**
   * Build the upstream K8s Watch API URL.
   * Routes through the resourcemanager control-plane proxy for org/project-scoped
   * resources, or directly to the K8s API for namespace/cluster-scoped resources.
   */
  private buildUpstreamUrl(req: WatchSubscribeRequest): string {
    const baseUrl = env.public.apiUrl;
    let path: string;

    if (req.orgId) {
      // Organization-scoped
      path = `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${req.orgId}/control-plane/${req.resourceType}`;
    } else if (req.projectId) {
      // Project-scoped (mirrors old WatchManager.buildUrl logic)
      const parts = req.resourceType.split('/');
      const resourceName = parts.pop();
      const apiPath = parts.join('/');
      path = `/apis/resourcemanager.miloapis.com/v1alpha1/projects/${req.projectId}/control-plane/${apiPath}/namespaces/${req.namespace ?? 'default'}/${resourceName}`;
    } else if (req.namespace) {
      // Namespace-scoped (mirrors old WatchManager.buildUrl logic)
      const parts = req.resourceType.split('/');
      const resourceName = parts.pop();
      const apiPath = parts.join('/');
      path = `/${apiPath}/namespaces/${req.namespace}/${resourceName}`;
    } else {
      // Cluster-scoped
      path = `/${req.resourceType}`;
    }

    const params = new URLSearchParams({ watch: 'true', timeoutSeconds: '30' });

    // For named watches, use fieldSelector on the collection endpoint
    // (same as client WatchManager — merge with existing fieldSelector if any)
    if (req.name) {
      const nameSelector = `metadata.name=${req.name}`;
      if (req.fieldSelector) {
        params.set('fieldSelector', `${req.fieldSelector},${nameSelector}`);
      } else {
        params.set('fieldSelector', nameSelector);
      }
    } else if (req.fieldSelector) {
      params.set('fieldSelector', req.fieldSelector);
    }

    if (req.labelSelector) params.set('labelSelector', req.labelSelector);

    return `${baseUrl}${path}?${params.toString()}`;
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

  /** Gracefully shut down all upstreams, timers, and client connections. */
  shutdown(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    for (const timer of this.graceTimers.values()) clearTimeout(timer);
    for (const upstream of this.upstreams.values()) upstream.controller.abort();
    this.clients.clear();
    this.upstreams.clear();
    this.subscriptions.clear();
    this.graceTimers.clear();
  }
}

/**
 * Singleton WatchHub instance.
 * Initialised once at server start; shut down on SIGTERM/SIGINT via `entry.ts`.
 */
export const watchHub = new WatchHub();
