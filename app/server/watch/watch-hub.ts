import type {
  WatchClient,
  WatchChannel,
  UpstreamWatch,
  WatchSubscribeRequest,
  WatchSSEEvent,
  WatchStats,
  RegisterClientResult,
} from './watch-hub.types';
import { logger } from '@/modules/logger';
import { buildWatchChannelKey } from '@/modules/watch/watch.channel-key';
import { parseWatchEvent, extractResourceVersion } from '@/modules/watch/watch.parser';
import { env } from '@/utils/env/env.server';

/** Max upstream reconnection attempts before broadcasting an error to clients. */
export const MAX_RECONNECT_ATTEMPTS = 5;
/** Base delay for exponential backoff on upstream reconnection (doubles each attempt). */
export const BASE_RECONNECT_DELAY = 1000;
/** Interval between heartbeat SSE events sent to all connected clients (ms). */
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
/** Maximum number of concurrent SSE clients the WatchHub will accept. */
const MAX_CLIENTS = 1000;
/** Maximum number of watch subscriptions a single client can hold. */
const MAX_SUBSCRIPTIONS_PER_CLIENT = 50;
/** Time (ms) after which an idle client with no subscriptions is pruned. */
const IDLE_CLIENT_TIMEOUT_MS = 120000;
/**
 * `timeoutSeconds` asked of the API. Caps how long one upstream connection
 * lives before the hub recycles it with the latest resourceVersion. The
 * authorization probe asks for the same value, so that it and the connection
 * it authorizes differ in nothing at all.
 */
const UPSTREAM_WATCH_TIMEOUT_SECONDS = 300;

/**
 * Ceiling on getting response headers back when opening a watch.
 *
 * `subscribe` awaits the open and concurrent opens for one channel share it,
 * so without this a control plane that never answers hangs the HTTP request
 * and every subscriber queued behind it.
 */
const UPSTREAM_OPEN_TIMEOUT_MS = 10000;

/**
 * How long an opened stream must stay connected, silent and error-free before
 * the hub treats it as authorized.
 *
 * An authorized watch of an empty collection sends nothing and holds the
 * connection open; a denial arrives at once and the connection ends. Waiting
 * is the only thing that tells those apart, and only a collection with nothing
 * in it pays the wait — anything with objects answers on its first chunk.
 */
const STREAM_ACCEPTANCE_SILENCE_MS = 2000;

/**
 * Ceiling on the whole authorization probe, headers and verdict together.
 * Reaching it is a refusal.
 */
const AUTHORIZATION_PROBE_TIMEOUT_MS = 5000;

/**
 * How long an accepted authorization stands before the user must be re-checked
 * on their next subscribe.
 *
 * Matched to the upstream's own `timeoutSeconds=300` recycle interval. This is
 * the bound on how stale an admission decision can be *for a client that keeps
 * re-subscribing* — navigation, remounts, SSE reconnects. It is not a bound on
 * a subscription held open continuously; see `authorizeJoin`.
 */
const AUTHORIZATION_TTL_MS = 300000;

/**
 * Raised when a subscriber's own credentials are not accepted for the channel
 * it asked for. Distinct from the hub's other failures so the route can answer
 * 403 rather than 400.
 */
export class WatchAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WatchAuthorizationError';
  }
}

/**
 * Raised when the upstream watch cannot be opened. Carries the HTTP status so
 * the caller can tell "you may not watch this" from "this did not work".
 */
class UpstreamOpenError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'UpstreamOpenError';
  }
}

/**
 * HTTP statuses reported to the caller as "you may not watch this".
 *
 * 404 is in the set deliberately. Distinguishing "you may not" from "it does
 * not exist" would answer, for any project id, whether that project is real —
 * to a caller who has just been told they cannot see it.
 */
const UNAUTHORIZED_STATUSES = new Set([401, 403, 404]);

/** A `reader.read()` that has been issued but has not yet resolved. */
type PendingRead = Promise<ReadableStreamReadResult<Uint8Array>>;

/** Verdict of {@link WatchHub.readStreamVerdict}. */
type StreamVerdict =
  | { accepted: true; consumed: Uint8Array[]; pending: PendingRead | null }
  | { accepted: false; reason: string };

/**
 * Raised only by {@link withDeadline}'s own timer, never by the promise it
 * races against.
 *
 * `withDeadline` is `Promise.race([promise, timeout])`, so a caller that
 * merely catches cannot tell "the deadline passed" from "the raced promise
 * itself rejected" — they arrive the same way. {@link WatchHub.readStreamVerdict}
 * depends on the distinction: only a timeout means the connection is idle and
 * therefore authorized; a rejection of the real `reader.read()` — a dropped
 * connection, a TLS reset, a proxy killing the response body mid-stream — is
 * not silence and must not be read as one.
 */
class DeadlineExceededError extends Error {
  constructor() {
    super('watch authorization probe timed out');
    this.name = 'DeadlineExceededError';
  }
}

/**
 * Reject if `promise` has not settled by `deadline` (epoch ms).
 *
 * The authorization probe cannot enforce its own ceiling by aborting the
 * fetch alone: an intermediary that ignores the abort would leave the read
 * pending and `subscribe` awaiting a verdict that never arrives. The deadline
 * is enforced here, on the await, as well as on the connection.
 */
function withDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new DeadlineExceededError()),
        Math.max(0, deadline - Date.now())
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

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
 * - **410 Gone handling**: Resets resourceVersion and reconnects on the same
 *   bounded, exponentially-backed-off retry policy as any other broken
 *   upstream — see {@link MAX_RECONNECT_ATTEMPTS} — broadcasting a `resync`
 *   marker before each retry and a `watch-error` once retries are exhausted.
 * - **Token affinity**: On each subscribe, the client's token is updated. On upstream
 *   reconnections, the freshest token from the upstream creator is preferred.
 * - **Per-subscriber authorization**: sharing a connection must not mean sharing the
 *   authorization that opened it. The invariant the hub actually holds is about
 *   *entry*, and it is worth stating exactly, because a looser reading of it is
 *   what the original defect hid behind:
 *
 *   > A client enters a channel's subscriber set only after the API has served a
 *   > watch of that channel's URL to that client's *own* credentials, as judged by
 *   > {@link WatchHub.readStreamVerdict}.
 *
 *   "Served", not "returned 2xx": on this stack a 200 can carry a denial in its
 *   body, so the status line alone decides nothing. Opening a channel establishes
 *   the fact for the opener — the upstream fetch is their check, awaited, and run
 *   through the same verdict as everyone else's. Joining an open channel
 *   establishes it with a probe of the same URL. There is no third path into the
 *   set, and {@link WatchHub.closeChannel} destroys the set together with the
 *   upstream.
 *
 *   What this deliberately does *not* say:
 *   - It is a check on entry, not a subscription that tracks entitlement. Re-entry
 *     re-checks once {@link AUTHORIZATION_TTL_MS} has passed, so a client that
 *     re-subscribes — navigation, remounts, SSE reconnects — is re-checked on that
 *     cadence and evicted if it now fails. A subscription held open continuously is
 *     not re-checked while it lives. See `authorizeJoin`.
 *   - The verdict reads a control plane's behaviour, not its intent. A control
 *     plane that denies by holding a 200 open and silent is indistinguishable from
 *     one serving an authorized watch of an empty collection, and is accepted. See
 *     `readStreamVerdict` for what each shape is taken to mean.
 * - **Heartbeat**: Sends a heartbeat every {@link HEARTBEAT_INTERVAL_MS} to keep
 *   SSE connections alive through proxies and load balancers.
 *
 * Instantiated as a singleton via {@link watchHub} and shut down on SIGTERM/SIGINT.
 */
export class WatchHub {
  private clients = new Map<string, WatchClient>();
  private upstreams = new Map<string, UpstreamWatch>();
  /**
   * Maps watchKey → the channel record holding that channel's subscriber set
   * and authorization memo.
   *
   * This — not {@link upstreams} — is what fan-out reads and what the
   * join-or-open decision in {@link subscribe} branches on. The two used to be
   * separate maps with different lifetimes, which let a subscriber set outlive
   * the upstream that authorized it and then be served by the next one.
   */
  private channels = new Map<string, WatchChannel>();
  /**
   * Channels whose first upstream open is still in flight, so that concurrent
   * subscribes to one channel share a single open instead of racing to create
   * two. Opening became awaited (it is the opener's authorization check), and
   * that await is a window in which `channels` and `upstreams` are both still
   * empty for the key.
   */
  private opening = new Map<string, Promise<WatchChannel>>();
  private graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Set by {@link shutdown}, so an open still in flight cannot repopulate the maps. */
  private isShutDown = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeat();
  }

  // ─── Client Lifecycle ────────────────────────────

  /**
   * Register an SSE client and send the initial `connected` event.
   *
   * A client id already bound to a different user is refused rather than
   * rebound. `channels` tracks subscribers by client id, so rebinding one
   * would hand the new user every channel membership that id already holds —
   * with no subscribe call, and therefore no authorization check. The id is a
   * v4 UUID but it travels as a query parameter on `GET /api/watch/stream`,
   * so it reaches access logs, proxy logs and `Referer` headers and cannot be
   * treated as a secret.
   *
   * Refusing rather than evicting is deliberate: evicting would let anyone who
   * learns an id knock its owner off their stream.
   */
  registerClient(client: WatchClient): RegisterClientResult {
    const existing = this.clients.get(client.id);
    if (existing && existing.userId !== client.userId) {
      return 'client-id-in-use';
    }

    if (!existing && this.clients.size >= MAX_CLIENTS) {
      return 'at-capacity';
    }

    this.clients.set(client.id, client);
    // The user id goes out with the handshake because the browser cannot know
    // it: it comes from the session cookie, and the browser's own idea of
    // "who am I" is a separate K8s User object. Channel keys for user-scoped
    // watches embed this value, so the client has to be told the same string
    // the hub will use — see `buildWatchChannelKey`.
    this.sendToClient(client.id, {
      event: 'connected',
      data: { clientId: client.id, userId: client.userId },
    });
    return 'accepted';
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

  /**
   * Update the auth token for all SSE clients owned by a specific user.
   * Called after a successful token refresh so that upstream reconnections
   * use the newly rotated access token instead of the stale one.
   */
  updateTokensByUserId(userId: string, accessToken: string): void {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        client.token = accessToken;
      }
    }
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
    // Resolve the client first: its userId is part of the key for user-scoped
    // watches, so there is no channel to speak of until we know who is asking.
    const client = this.clients.get(req.clientId);
    if (!client) throw new Error('Client not registered');

    const watchKey = this.buildWatchKey(req, client.userId);

    if (client.subscriptions.size >= MAX_SUBSCRIPTIONS_PER_CLIENT) {
      throw new Error('Maximum subscriptions per client exceeded');
    }

    // Join or open — branching on `channels`, the map that governs fan-out,
    // rather than on `upstreams`. Both arms authorize this client before it
    // reaches a subscriber set, so there is no third path.
    const channel =
      this.liveChannel(watchKey) ?? (await this.openChannelOnce(watchKey, req, client));

    // Unconditional, including for a client already in the set: `authorizeJoin`
    // memoizes, so this is cheap when the admission still stands and is the
    // only thing that re-checks it once it lapses.
    await this.admitToChannel(channel, client);

    this.sendToClient(req.clientId, {
      event: 'subscribed',
      data: { channel: watchKey },
    });

    return watchKey;
  }

  /**
   * The channel for this key, but only while its upstream is alive.
   *
   * The two are created and destroyed together, so a channel without an
   * upstream should be unreachable. Treating one as absent anyway — and
   * tearing it down — is the difference between an invariant that is merely
   * maintained and one that is enforced. Were the pair ever to drift apart,
   * what is left behind is a set of subscribers that the next upstream,
   * opened and authorized by somebody else, would fan out to.
   */
  private liveChannel(watchKey: string): WatchChannel | undefined {
    const channel = this.channels.get(watchKey);
    if (!channel) return undefined;
    if (this.upstreams.has(watchKey)) return channel;

    this.closeChannel(watchKey);
    return undefined;
  }

  /**
   * Authorize a client for an existing channel and add it to the subscriber
   * set. For a joiner this is the only writer of `channel.subscribers`. The
   * one exception is the channel's own opener: {@link openChannel} adds it
   * directly, before its upstream starts draining, so the events that
   * authorized the open have somewhere to go — guarded there by the same
   * identity check this method uses, so a client that is already gone by
   * the time `openChannel` gets to it is never added in the first place.
   * This method still runs afterward for that same client, on the same
   * terms as anyone else's, and its identity re-check below is what undoes
   * that early add if the opener went away in the narrow window before this
   * call.
   */
  private async admitToChannel(channel: WatchChannel, client: WatchClient): Promise<void> {
    try {
      await this.authorizeJoin(channel, client);
    } catch (err) {
      // A client already in the set whose admission can no longer be
      // authorized is removed, not merely refused: it must not keep receiving
      // the fan-out on the strength of a decision that has since lapsed.
      this.retractSubscription(channel, client);
      this.releaseChannel(channel);
      throw err;
    }

    // Authorizing is a network round trip and the client can go away during
    // it: the SSE stream aborts, `removeClient` runs, and it finds nothing to
    // clean up because nothing has been added yet for a joiner — or, for the
    // opener, because `openChannel`'s own add happened before this client had
    // any chance to disconnect and this is the first check since. Leaving a
    // dead client id in the set either way would pin a connection that can
    // never reach zero, so the channel and its upstream would never be torn
    // down again. The same window can also hand back a channel record
    // `closeChannel` has since detached.
    if (this.clients.get(client.id) !== client || this.channels.get(channel.key) !== channel) {
      this.retractSubscription(channel, client);
      this.releaseChannel(channel);
      throw new Error('Subscription is no longer current');
    }

    // Only now that the client is actually going in is it worth holding the
    // channel open. Cancelling before the check would have let a stream of
    // refused subscribes keep somebody else's idle upstream alive.
    this.cancelGraceTimer(channel.key);

    client.subscriptions.add(channel.key);
    channel.subscribers.add(client.id);
  }

  /**
   * Undo a subscription this specific `client` object added, or was about
   * to be given credit for, without erasing a different client that
   * currently, legitimately holds the same id.
   *
   * `channel.subscribers` is a `Set<string>` keyed by client id, and
   * `registerClient` deliberately lets a user reconnect and re-register the
   * same id under a brand new client object (see "lets the same user
   * re-register after a reconnect"). A stale `client` reference — one that
   * has disconnected, or been superseded by that reconnect — must not
   * blindly delete `client.id`: if whoever is *currently* registered under
   * that id already considers itself subscribed to this channel, deleting
   * by id alone would silently unsubscribe them instead of undoing our own
   * stale entry. Safe to delete exactly when the currently-registered
   * client for this id, if any, does not itself claim this channel — in
   * every other case, any id sitting in `channel.subscribers` must be ours.
   *
   * `client.subscriptions` does not need the same care: each client object
   * owns its own `Set`, created fresh on every `registerClient`, so deleting
   * from a stale one never touches a fresher client's bookkeeping.
   */
  private retractSubscription(channel: WatchChannel, client: WatchClient): void {
    const current = this.clients.get(client.id);
    if (!current || !current.subscriptions.has(channel.key)) {
      channel.subscribers.delete(client.id);
    }
    client.subscriptions.delete(channel.key);
  }

  /**
   * Let an idle channel resume its countdown to close — but only while the
   * record still is the one registered for its key, since arming a timer off
   * a detached record would target whatever replaced it.
   */
  private releaseChannel(channel: WatchChannel): void {
    if (this.channels.get(channel.key) !== channel) return;
    this.armGraceTimerIfIdle(channel.key);
  }

  /**
   * Check that a client may be admitted to a channel, going to the API with
   * that client's own credentials unless a recent acceptance still stands.
   *
   * The memo's bound is honest about what it covers: a client that keeps
   * re-subscribing is re-checked every {@link AUTHORIZATION_TTL_MS}, but a
   * subscription held open continuously is not re-checked while it lives.
   * Access revoked under such a client is noticed when the channel is torn
   * down — on upstream failure, or {@link UPSTREAM_GRACE_PERIOD_MS} after the
   * last subscriber leaves — not before.
   */
  private async authorizeJoin(channel: WatchChannel, client: WatchClient): Promise<void> {
    const authorizedUntil = channel.authorizedUntil.get(client.userId);
    if (authorizedUntil !== undefined && authorizedUntil > Date.now()) return;

    await this.probeChannelAccess(channel.url, client.token);
    channel.authorizedUntil.set(client.userId, Date.now() + AUTHORIZATION_TTL_MS);
  }

  /**
   * Open a channel, or join the open somebody else already started.
   *
   * Sharing an in-flight open means a loser of the race inherits the winner's
   * failure as well as their success. That is the fail-closed direction, it
   * only bites when two subscribes for one channel land in the same few
   * milliseconds, and the loser's next subscribe opens for itself.
   *
   * Sharing the *channel* is not sharing the authorization: whoever the open
   * did not authorize is still probed by `admitToChannel` before entering the
   * subscriber set.
   */
  private openChannelOnce(
    watchKey: string,
    req: WatchSubscribeRequest,
    client: WatchClient
  ): Promise<WatchChannel> {
    const inFlight = this.opening.get(watchKey);
    if (inFlight) return inFlight;

    const opening = this.openChannel(watchKey, req, client).finally(() => {
      this.opening.delete(watchKey);
    });
    this.opening.set(watchKey, opening);
    return opening;
  }

  /**
   * Open a new channel, with the requesting client's own token.
   *
   * The upstream fetch is awaited rather than fired and forgotten because it
   * *is* this client's authorization check. Awaiting it buys three things: a
   * refusal fails the subscribe instead of surfacing half a minute later as a
   * `watch-error`; the client never enters a subscriber set for a channel it
   * cannot watch; and a channel that could not be opened is never created, so
   * it cannot be inherited by whoever subscribes next.
   *
   * The opener is added to `channel.subscribers` here, before
   * {@link runUpstream} is started, and only if it is still the currently
   * registered client for its id. `runUpstream`'s prefix-draining loop runs
   * synchronously — no `await` separates it from this function returning — so
   * without the early add, the events that just authorized the open would be
   * broadcast to an empty subscriber set and lost: `upstream.resourceVersion`
   * advances past them regardless, so a reconnect cannot recover them either.
   * The identity check guards it for the same reason {@link admitToChannel}
   * has one: `registerClient` lets a user reconnect under the same client
   * id, and adding an id unconditionally here would risk it belonging, by
   * the time this runs, to a client that has nothing to do with this open.
   * `subscribe`'s own call to {@link admitToChannel} still runs afterward for
   * this same client; it is a safe no-op when the opener is still around, and
   * its identity re-check — now paired with an identity-aware retraction —
   * undoes the early add if they are not.
   */
  private async openChannel(
    watchKey: string,
    req: WatchSubscribeRequest,
    client: WatchClient
  ): Promise<WatchChannel> {
    const url = this.buildUpstreamUrl(req, client.userId);
    const upstream: UpstreamWatch = {
      key: watchKey,
      url,
      controller: new AbortController(),
      resourceVersion: '0',
      lastActivity: Date.now(),
      reconnectAttempts: 0,
      isConnecting: true,
      creatorUserId: client.userId,
    };

    let reader: ReadableStreamDefaultReader<Uint8Array>;
    try {
      reader = await this.openUpstreamStream(upstream, client.token);
    } catch (err) {
      throw this.asSubscriberFacingError(err, watchKey);
    }

    // Decided by the same rule as the probe. An HTTP 200 on its own would let
    // a control plane that denies in-band — the shape this hub already parses
    // for 410 Gone — admit an opener; and an opener admitted is a channel
    // created, a memo written, and a reconnect loop that never trips its
    // retry ceiling because every "successful" open resets the count.
    const verdict = await this.readStreamVerdict(reader);
    if (!verdict.accepted) {
      upstream.controller.abort();
      logger.warn('[WatchHub] refused an upstream open', {
        key: watchKey,
        reason: verdict.reason,
      });
      throw new WatchAuthorizationError('Not authorized to watch this channel');
    }

    // `shutdown()` may have run while the open was in flight. Do not
    // repopulate the maps it has just cleared.
    if (this.isShutDown) {
      upstream.controller.abort();
      throw new Error('Watch hub is shutting down');
    }

    const channel: WatchChannel = {
      key: watchKey,
      url,
      subscribers: new Set(),
      // The open above was this user's check; record it on the same terms as
      // any other, so it expires like any other.
      authorizedUntil: new Map([[client.userId, Date.now() + AUTHORIZATION_TTL_MS]]),
    };

    this.channels.set(watchKey, channel);
    this.upstreams.set(watchKey, upstream);

    // Admit the opener before the upstream starts draining — see the doc
    // above. Guarded exactly like `admitToChannel`'s own writes: only if
    // this is still the registered client for its id, so a client that
    // disconnected during the awaits above (or was superseded by a
    // reconnect under the same id) is not added at all. `admitToChannel`
    // runs again for this client once `subscribe` regains control; the add
    // is idempotent (`Set.add`) when the opener is still current, and its
    // identity re-check still catches one that is not.
    if (this.clients.get(client.id) === client) {
      channel.subscribers.add(client.id);
      client.subscriptions.add(channel.key);
    }

    void this.runUpstream(upstream, reader, client.token, verdict.consumed, verdict.pending);

    return channel;
  }

  /**
   * Map an upstream open failure to something safe to hand the caller.
   *
   * {@link UpstreamOpenError} carries the control plane's own response body
   * and the internal channel key, and the subscribe route puts `err.message`
   * straight into its JSON. Neither belongs in an HTTP response, so the detail
   * is logged and the caller gets a fixed string.
   */
  private asSubscriberFacingError(err: unknown, watchKey: string): Error {
    if (!(err instanceof UpstreamOpenError)) return err as Error;

    logger.warn('[WatchHub] upstream open failed', { key: watchKey, detail: err.message });

    return UNAUTHORIZED_STATUSES.has(err.status)
      ? new WatchAuthorizationError('Not authorized to watch this channel')
      : new Error('Unable to open the requested watch');
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
    const channel = this.channels.get(watchKey);
    if (!channel) return;

    channel.subscribers.delete(clientId);
    this.armGraceTimerIfIdle(watchKey);
  }

  /**
   * Start the countdown to closing an idle channel. The record itself stays
   * for the grace period — it is the upstream's twin, and the upstream is
   * deliberately still up, so that navigation does not pay for a teardown and
   * a fresh open.
   */
  private armGraceTimerIfIdle(watchKey: string): void {
    const channel = this.channels.get(watchKey);
    if (!channel || channel.subscribers.size > 0) return;
    if (this.graceTimers.has(watchKey)) return;

    this.graceTimers.set(
      watchKey,
      setTimeout(() => {
        this.graceTimers.delete(watchKey);
        this.closeChannel(watchKey);
      }, UPSTREAM_GRACE_PERIOD_MS)
    );
  }

  private cancelGraceTimer(watchKey: string): void {
    const timer = this.graceTimers.get(watchKey);
    if (!timer) return;
    clearTimeout(timer);
    this.graceTimers.delete(watchKey);
  }

  // ─── Internal: Upstream K8s Watch ────────────────

  /**
   * Open the upstream watch connection and hand back its reader.
   *
   * Split out of the read loop so the caller can await the API's verdict on
   * the connection without waiting on the stream it produces. Deadlined,
   * because `subscribe` awaits this.
   *
   * @throws {UpstreamOpenError} if the API refuses, returns no body, or does
   *         not answer within {@link UPSTREAM_OPEN_TIMEOUT_MS}.
   */
  private async openUpstreamStream(
    upstream: UpstreamWatch,
    token: string
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    upstream.isConnecting = true;
    const deadline = Date.now() + UPSTREAM_OPEN_TIMEOUT_MS;
    const watchUrl = this.buildWatchUrl(upstream.url, upstream.resourceVersion);

    let response: Response;
    try {
      response = await withDeadline(
        fetch(watchUrl, {
          signal: upstream.controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }),
        deadline
      );
    } catch (err) {
      // Release the socket the abandoned fetch may still be holding.
      upstream.controller.abort();
      throw new UpstreamOpenError(0, `Upstream watch unreachable: ${(err as Error).message}`);
    }

    if (!response.ok || !response.body) {
      const bodyText = response.body
        ? await withDeadline(response.text(), deadline).catch(() => '')
        : '';
      throw new UpstreamOpenError(
        response.status,
        `Upstream watch failed: ${response.status} key=${upstream.key} body=${bodyText.slice(0, 500)}`
      );
    }

    upstream.isConnecting = false;
    upstream.lastActivity = Date.now();

    // `reconnectAttempts` is NOT reset here. An HTTP-level 200 is not proof
    // the connection is actually serving — Kubernetes reports 410 Gone as a
    // 200 whose body carries an error `Status` (see `readStreamVerdict` and
    // `drain` below), and every real reconnect passes through this method
    // first. Resetting on the status line alone would clear the budget
    // right before `drain` reads it, so a persistently-expiring
    // resourceVersion would never reach `MAX_RECONNECT_ATTEMPTS`. The reset
    // happens in `pumpUpstream`'s `drain`, once a genuine event proves the
    // stream is actually being served.
    return response.body.getReader();
  }

  /**
   * The upstream watch URL.
   *
   * `resourceVersion` is always sent — the K8s watch API, especially behind
   * the resourcemanager control-plane proxy, needs it to initialise the
   * stream. `watch=true` streams events instead of returning a single LIST,
   * and `allowWatchBookmarks` lets the apiserver push periodic resourceVersion
   * bookmarks so a reconnect resumes without a 410 storm.
   *
   * Shared with {@link buildProbeUrl}, so the probe and the connection it
   * authorizes cannot end up asking for different things.
   */
  private buildWatchUrl(baseUrl: string, resourceVersion: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('watch', 'true');
    url.searchParams.set('allowWatchBookmarks', 'true');
    url.searchParams.set('timeoutSeconds', String(UPSTREAM_WATCH_TIMEOUT_SECONDS));
    url.searchParams.set('resourceVersion', resourceVersion);
    return url.toString();
  }

  /**
   * Read an opened watch stream far enough to decide whether the API served
   * it to this caller.
   *
   * Both ways into a subscriber set are decided here, by one rule, because an
   * HTTP 200 is not on its own an acceptance on this stack: Kubernetes reports
   * 410 Gone as a 200 whose body carries a `Status`, so a control plane that
   * reports a denial the same way — or by closing an empty 200 — reads as a
   * pass to anything that only inspects the status line.
   *
   * Accepted:
   * - a parsed watch event that is not an ERROR — the API served this caller;
   * - the connection still open, silent and error-free after
   *   {@link STREAM_ACCEPTANCE_SILENCE_MS}. An authorized watch of an empty
   *   collection sends nothing and holds the connection for
   *   {@link UPSTREAM_WATCH_TIMEOUT_SECONDS}; a denial does not hold it at all.
   *
   * Refused:
   * - any ERROR envelope, whatever code it carries or fails to carry;
   * - any non-blank line that is not a watch envelope, which is how an
   *   ordinary Kubernetes `Status` error body arrives;
   * - the stream ending, which an authorized watch does not do this quickly;
   * - the read itself rejecting for any reason other than
   *   {@link DeadlineExceededError} — a dropped connection, a TLS reset, a
   *   proxy killing the response body mid-stream. None of those are silence.
   *
   * Returns what it consumed and any read still in flight, so the caller can
   * carry on from where this stopped: on the open path the same stream becomes
   * the channel's live upstream, and these are its first events. Abandoning an
   * in-flight read would hand the next chunk to nobody.
   */
  private async readStreamVerdict(
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): Promise<StreamVerdict> {
    const decoder = new TextDecoder();
    const consumed: Uint8Array[] = [];
    const silenceDeadline = Date.now() + STREAM_ACCEPTANCE_SILENCE_MS;
    let buffer = '';

    while (true) {
      const pending = reader.read();
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await withDeadline(pending, silenceDeadline);
      } catch (err) {
        if (err instanceof DeadlineExceededError) {
          // Silent and still connected: an idle authorized watch. The only
          // silence this hub reads as a yes.
          return { accepted: true, consumed, pending };
        }
        // The race's other side — the real read — is what rejected: a
        // dropped connection, a TLS reset, a proxy killing the body
        // mid-stream. That is not silence, so it is not a yes.
        return {
          accepted: false,
          reason: `stream read failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }

      if (chunk.done) {
        return { accepted: false, reason: 'stream ended without serving anything' };
      }

      consumed.push(chunk.value);
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        const event = parseWatchEvent(line);
        if (!event) {
          return {
            accepted: false,
            reason: 'API answered with something other than a watch stream',
          };
        }
        if (event.type === 'ERROR') {
          return { accepted: false, reason: 'API refused the watch' };
        }
        return { accepted: true, consumed, pending: null };
      }
    }
  }

  /** Drive an already-open upstream, routing any failure to the retry policy. */
  private async runUpstream(
    upstream: UpstreamWatch,
    reader: ReadableStreamDefaultReader<Uint8Array>,
    token: string,
    prefix: Uint8Array[],
    pending: PendingRead | null
  ): Promise<void> {
    try {
      await this.pumpUpstream(upstream, reader, token, prefix, pending);
    } catch (err) {
      this.handleUpstreamFailure(upstream, token, err);
    }
  }

  /** Open and drive an upstream. Used for reconnections. */
  private async connectUpstream(upstream: UpstreamWatch, token: string): Promise<void> {
    try {
      const reader = await this.openUpstreamStream(upstream, token);
      await this.pumpUpstream(upstream, reader, token);
    } catch (err) {
      this.handleUpstreamFailure(upstream, token, err);
    }
  }

  /**
   * Read the upstream stream to its end, fanning events out as they arrive,
   * then reconnect if anyone is still listening.
   *
   * `prefix` and `pending` carry over whatever {@link readStreamVerdict} took
   * off this stream to authorize it, so none of it is lost — on the open
   * path this only holds because {@link openChannel} admits the opener into
   * `channel.subscribers` before starting this pump; without that, the
   * prefix loop below broadcasts to an empty set and `upstream.resourceVersion`
   * still advances past what was thrown away.
   */
  private async pumpUpstream(
    upstream: UpstreamWatch,
    reader: ReadableStreamDefaultReader<Uint8Array>,
    token: string,
    prefix: Uint8Array[] = [],
    pending: PendingRead | null = null
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    /** Returns false once the loop has handed off (410 reconnect scheduled). */
    const drain = (value: Uint8Array): boolean => {
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
            upstream.resourceVersion = '0';
            reader.cancel();

            if (upstream.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              // Clients are not left in the dark about the replay this
              // triggers — see WatchEventType.RESYNC. Broadcast the marker
              // BEFORE reconnecting so it always precedes the replay it
              // describes.
              this.broadcastToChannel(upstream.key, {
                event: 'resync',
                data: { channel: upstream.key },
              });
              const delay = BASE_RECONNECT_DELAY * Math.pow(2, upstream.reconnectAttempts);
              this.scheduleUpstreamReconnect(upstream, token, delay);
            } else {
              // Max retries exceeded — same bound and same fate as any other
              // broken upstream; see `handleUpstreamFailure`. A 410 that keeps
              // recurring is not silently retried forever: an unbounded loop
              // here would re-broadcast a resync marker (and re-open every
              // subscriber's replay window) on every iteration, turning a
              // control-plane fault into an SSE broadcast storm.
              this.broadcastToChannel(upstream.key, {
                event: 'watch-error',
                data: {
                  channel: upstream.key,
                  message: 'Max reconnection attempts exceeded',
                },
              });
              this.closeChannel(upstream.key);
            }
            return false;
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

        // A non-ERROR event served by this connection — the proof
        // `openUpstreamStream` deliberately withheld that this attempt is
        // genuinely serving, not just a 200 that turns out to carry an
        // in-band error on the very first read. Reset here, so a reconnect
        // that hits another in-band 410 still finds its unspent budget from
        // before this attempt, while one that recovers is not left carrying
        // stale attempts toward the ceiling.
        upstream.reconnectAttempts = 0;

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

      return true;
    };

    for (const chunk of prefix) {
      if (!drain(chunk)) return;
    }

    while (true) {
      const { done, value } = await (pending ?? reader.read());
      pending = null;
      if (done) break;
      if (!drain(value)) return;
    }

    // Stream ended normally — reconnect if still subscribed
    if ((this.channels.get(upstream.key)?.subscribers.size ?? 0) > 0) {
      this.scheduleUpstreamReconnect(upstream, token, 1000);
    }
  }

  /** Back off and retry a broken upstream, or give up and close the channel. */
  private handleUpstreamFailure(upstream: UpstreamWatch, token: string, err: unknown): void {
    if ((err as Error).name === 'AbortError') return; // Intentional close

    upstream.isConnecting = false;

    if (upstream.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = BASE_RECONNECT_DELAY * Math.pow(2, upstream.reconnectAttempts);
      this.scheduleUpstreamReconnect(upstream, token, delay);
      return;
    }

    // Max retries exceeded. Tell the subscribers before closing, because
    // closing takes the channel — and them with it.
    this.broadcastToChannel(upstream.key, {
      event: 'watch-error',
      data: {
        channel: upstream.key,
        message: 'Max reconnection attempts exceeded',
      },
    });
    this.closeChannel(upstream.key);
  }

  private scheduleUpstreamReconnect(upstream: UpstreamWatch, token: string, delayMs: number): void {
    upstream.reconnectAttempts++;
    setTimeout(() => {
      // Identity, not presence: a close-and-reopen inside the backoff window
      // registers a new upstream under this key, and reviving the old object
      // would double every event onto a connection `closeChannel` can no
      // longer reach.
      if (this.upstreams.get(upstream.key) !== upstream) return;
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
    const channel = this.channels.get(watchKey);
    if (!channel) return undefined;

    const upstream = this.upstreams.get(watchKey);
    const creatorUserId = upstream?.creatorUserId;
    let fallbackToken: string | undefined;

    for (const clientId of channel.subscribers) {
      const client = this.clients.get(clientId);
      if (!client) continue;

      if (creatorUserId && client.userId === creatorUserId) {
        return client.token;
      }
      if (!fallbackToken) fallbackToken = client.token;
    }

    return fallbackToken;
  }

  /**
   * Ask the API whether these credentials may watch this URL.
   *
   * Same URL and same verb as the channel's own upstream. Going to the real
   * endpoint rather than to a SelfSubjectAccessReview keeps the check and the
   * thing it authorizes from being able to disagree: any mapping from a watch
   * URL to a (group, resource, namespace) triple is another place for the two
   * to drift apart, and it would also miss `resourceNames`-scoped grants.
   *
   * A non-2xx, an unreachable API, and running out of time here are all "no".
   * What the stream itself means is decided by {@link readStreamVerdict}, which
   * is where the one shape that is *not* fail-closed lives: a 200 held open and
   * silent is read as an authorized watch of an empty collection.
   *
   * A subscriber refused here loses live updates on that one channel and gets
   * another chance on their next subscribe, which is the right side to err on
   * when the alternative is handing them resources they have no claim to.
   *
   * @throws {WatchAuthorizationError} if the API refuses, or cannot be asked.
   */
  private async probeChannelAccess(url: string, token: string): Promise<void> {
    const controller = new AbortController();
    const deadline = Date.now() + AUTHORIZATION_PROBE_TIMEOUT_MS;

    try {
      const response = await withDeadline(
        fetch(this.buildProbeUrl(url), {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }),
        deadline
      );

      if (!response.ok || !response.body) {
        throw new WatchAuthorizationError('Not authorized to watch this channel');
      }

      const verdict = await withDeadline(
        this.readStreamVerdict(response.body.getReader()),
        deadline
      );
      if (!verdict.accepted) {
        logger.warn('[WatchHub] refused a channel join', { reason: verdict.reason });
        throw new WatchAuthorizationError('Not authorized to watch this channel');
      }
      // The probe wanted the verdict, not the stream; let the abort below
      // settle whatever read it left in flight.
      verdict.pending?.catch(() => {});
    } catch (err) {
      if (err instanceof WatchAuthorizationError) throw err;
      throw new WatchAuthorizationError('Could not verify access to this watch channel');
    } finally {
      // The probe wanted a verdict, not the data behind it.
      controller.abort();
    }
  }

  /**
   * Build the probe URL from the channel's own upstream URL, so the two cannot
   * end up addressing different things: same path, same selectors, only the
   * watch control parameters differ.
   *
   * It asks for exactly what the upstream asks for, via the same builder, so
   * the two cannot drift. `URLSearchParams.set` replaces rather than appends,
   * which matters: the base URL already carries a `timeoutSeconds`, and Go
   * reads the first occurrence of a repeated query parameter, so a second
   * appended one would be silently ignored.
   */
  private buildProbeUrl(upstreamUrl: string): string {
    return this.buildWatchUrl(upstreamUrl, '0');
  }

  /**
   * Tear a channel down: abort its upstream and drop its subscriber set with
   * it.
   *
   * The two must die together. A subscriber set that outlived its upstream
   * would be a set of clients that the *next* upstream — opened, and
   * authorized, by whoever subscribes next — silently fans out to.
   */
  private closeChannel(watchKey: string): void {
    const upstream = this.upstreams.get(watchKey);
    if (upstream) {
      upstream.controller.abort();
      this.upstreams.delete(watchKey);
    }

    this.cancelGraceTimer(watchKey);

    const channel = this.channels.get(watchKey);
    if (!channel) return;
    this.channels.delete(watchKey);

    // Tell the survivors, and forget them, so a re-subscribe is authorized
    // afresh rather than resumed.
    for (const clientId of Array.from(channel.subscribers)) {
      this.clients.get(clientId)?.subscriptions.delete(watchKey);
      this.sendToClient(clientId, { event: 'unsubscribed', data: { channel: watchKey } });
    }
    channel.subscribers.clear();
  }

  // ─── Internal: SSE Broadcast ─────────────────────

  private sendToClient(clientId: string, event: WatchSSEEvent): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // `writeSSE` is async: a broken stream rejects rather than throwing, and
      // an unobserved rejection would skip the eviction that keeps a dead
      // client out of a subscriber set.
      void Promise.resolve(
        client.stream.writeSSE({
          event: event.event,
          data: JSON.stringify(event.data),
        })
      ).catch(() => this.removeClient(clientId));
      client.lastActivity = Date.now();
    } catch {
      // Client disconnected — will be cleaned up
      this.removeClient(clientId);
    }
  }

  private broadcastToChannel(watchKey: string, event: WatchSSEEvent): void {
    const channel = this.channels.get(watchKey);
    if (!channel) return;

    // Snapshot to avoid mutation during iteration (sendToClient may remove clients)
    for (const clientId of Array.from(channel.subscribers)) {
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
   * Build the deterministic key for a watch subscription.
   *
   * Delegates to {@link buildWatchChannelKey}, which the browser's
   * `WatchManager` also calls — subscribe/unsubscribe and event fan-out all
   * route by this string, so the two sides must derive it identically.
   *
   * `userId` is the session user, and it lands in the key for user-scoped
   * watches so that two users never share one channel (and therefore never
   * share the single upstream opened against one of their control planes).
   */
  private buildWatchKey(req: WatchSubscribeRequest, userId: string): string {
    return buildWatchChannelKey(req, userId);
  }

  /**
   * Build the upstream K8s Watch API URL.
   * Routes through the resourcemanager control-plane proxy for org/project-scoped
   * resources, or directly to the K8s API for namespace/cluster-scoped resources.
   */
  private buildUpstreamUrl(req: WatchSubscribeRequest, userId?: string): string {
    const baseUrl = env.public.apiUrl;
    let path: string;

    if (req.userScoped) {
      // User-scoped: watch across all namespaces for the authenticated user.
      // Must use the real userId — NOT 'me' — because this fetch() bypasses
      // the axios interceptor that normally rewrites /users/me/ → /users/{id}/.
      if (!userId) throw new Error('[WatchHub] userId required for userScoped watch');
      path = `/apis/iam.miloapis.com/v1alpha1/users/${userId}/control-plane/${req.resourceType}`;
    } else if (req.orgId) {
      // Organization-scoped. When a namespace is also provided the
      // resource is namespaced inside the org's control plane (billing
      // accounts, payment methods, bindings) — the namespace segment
      // has to be spliced into the apis/<group>/<version>/<resource>
      // path. Without a namespace we're watching a cluster-scoped
      // resource inside the org (e.g. Project).
      if (req.namespace) {
        const parts = req.resourceType.split('/');
        const resourceName = parts.pop();
        const apiPath = parts.join('/');
        path = `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${req.orgId}/control-plane/${apiPath}/namespaces/${req.namespace}/${resourceName}`;
      } else {
        path = `/apis/resourcemanager.miloapis.com/v1alpha1/organizations/${req.orgId}/control-plane/${req.resourceType}`;
      }
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
        Array.from(this.channels.entries()).map(([k, c]) => [k, c.subscribers.size])
      ),
    };
  }

  // ─── Shutdown ────────────────────────────────────

  /** Gracefully shut down all upstreams, timers, and client connections. */
  shutdown(): void {
    this.isShutDown = true;
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    for (const timer of this.graceTimers.values()) clearTimeout(timer);
    for (const upstream of this.upstreams.values()) upstream.controller.abort();
    this.clients.clear();
    this.upstreams.clear();
    this.channels.clear();
    this.opening.clear();
    this.graceTimers.clear();
  }
}

/**
 * Singleton WatchHub instance.
 * Initialised once at server start; shut down on SIGTERM/SIGINT via `entry.ts`.
 */
export const watchHub = new WatchHub();
