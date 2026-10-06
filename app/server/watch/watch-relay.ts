import type { WatchHub } from './watch-hub';
import { buildChannelKey } from './watch-hub.keys';
import {
  watchSubscribeSchema,
  watchUnsubscribeSchema,
  type WatchSubscribeRequest,
} from './watch-hub.types';
import { logger } from '@/modules/logger';
import { relayRetryDelay } from '@/modules/redis/retry';
import { z } from 'zod';

/**
 * Cross-pod relay for watch subscribes (#1614). Each pod records the streams it
 * holds in Redis (`watch:cid:<cid>`) and listens on `watch:pod:<podId>`; a pod
 * that gets a POST for a stream it does not hold publishes it to the owner.
 *
 * Tokens never go through Redis, and messages are never logged. When delivery
 * fails for any reason the caller gets `not_owner` and the route answers 409.
 */

export const OWNER_TTL_SECONDS = 60;

export interface RelayPipeline {
  set(key: string, value: string, mode: 'EX', seconds: number): RelayPipeline;
  exec(): Promise<Array<[error: Error | null, result: unknown]> | null>;
}

export interface RelayRedis {
  status: string;
  set(key: string, value: string, mode: 'EX', seconds: number): Promise<unknown>;
  get(key: string): Promise<string | null>;
  publish(channel: string, message: string): Promise<number>;
  pipeline(): RelayPipeline;
  eval(script: string, numKeys: number, key: string, podId: string): Promise<unknown>;
  quit(): Promise<unknown>;
}

export interface RelaySubscriber {
  subscribe(channel: string): Promise<unknown>;
  on(event: 'message', fn: (channel: string, message: string) => void): void;
  on(event: 'ready', fn: () => void): void;
  quit(): Promise<unknown>;
}

export type RelayHub = Pick<
  WatchHub,
  'subscribe' | 'unsubscribe' | 'isClientOwnedBy' | 'hasClient' | 'sendSubscribeFailed'
>;

export type RelayResult =
  { kind: 'relayed'; channel: string } | { kind: 'forbidden' } | { kind: 'not_owner' };

export interface WatchRelay {
  registerOwner(cid: string, userId: string): Promise<void>;
  refreshOwners(owners: Iterable<[cid: string, userId: string]>): Promise<void>;
  releaseOwner(cid: string): Promise<void>;
  relaySubscribe(req: WatchSubscribeRequest, userId: string): Promise<RelayResult>;
  relayUnsubscribe(clientId: string, channel: string, userId: string): Promise<RelayResult>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface WatchRelayDeps {
  redis: RelayRedis | null;
  subscriber: RelaySubscriber | null;
  podId: string;
  hub: RelayHub;
  enabled: boolean;
  retryDelayMs?: (attempt: number) => number;
}

/**
 * Per-boot suffix: a restarted pod keeps its `HOSTNAME`, and must not accept
 * messages routed via its previous boot's keys (409 instead of a dropped 202).
 */
export function createPodId(hostname: string | undefined): string {
  const boot = crypto.randomUUID();
  return hostname ? `${hostname}-${boot.slice(0, 8)}` : boot;
}

const ownerKey = (cid: string) => `watch:cid:${cid}`;
const podChannel = (podId: string) => `watch:pod:${podId}`;

/** Atomic compare-and-delete, so a key the client's new pod wrote is never removed. */
const RELEASE_OWNER_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local ok, owner = pcall(cjson.decode, raw)
if ok and type(owner) == 'table' and owner.podId ~= ARGV[1] then return 0 end
return redis.call('DEL', KEYS[1])
`;

const ownerSchema = z.object({ podId: z.string().min(1), userId: z.string().min(1) });

/** Redis is shared state, so the owning pod validates what it reads like any request body. */
const relayMessageSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('subscribe'), req: watchSubscribeSchema, userId: z.string().min(1) }),
  watchUnsubscribeSchema.extend({ op: z.literal('unsubscribe'), userId: z.string().min(1) }),
]);

type RelayMessage = z.infer<typeof relayMessageSchema>;

const NOT_OWNER: RelayResult = { kind: 'not_owner' };
const FORBIDDEN: RelayResult = { kind: 'forbidden' };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createWatchRelay(deps: WatchRelayDeps): WatchRelay {
  const { redis, subscriber, podId, hub, enabled, retryDelayMs = relayRetryDelay } = deps;
  const ownerValue = (userId: string) => JSON.stringify({ podId, userId });
  const stopping = new AbortController();
  const releasing = new Set<Promise<void>>();

  const ready = (): RelayRedis | null =>
    enabled && !stopping.signal.aborted && redis !== null && redis.status === 'ready'
      ? redis
      : null;

  const warn = (message: string, error: unknown) =>
    logger.warn(`[watch-relay] ${message}`, { error: errorMessage(error) });

  /**
   * Plain SET, last writer wins. A stale pod can briefly overwrite a moved
   * client's key; it heals at the new pod's next refresh, so no compare-and-set.
   */
  async function writeOwner(cid: string, userId: string): Promise<void> {
    const client = ready();
    if (!client) return;
    try {
      await client.set(ownerKey(cid), ownerValue(userId), 'EX', OWNER_TTL_SECONDS);
    } catch (error) {
      warn('Could not record stream owner', error);
    }
  }

  async function relay(
    cid: string,
    userId: string,
    channel: string,
    message: RelayMessage
  ): Promise<RelayResult> {
    const client = ready();
    if (!client) return NOT_OWNER;
    try {
      const raw = await client.get(ownerKey(cid));
      // Missing right after a Redis restart, until the owner's next refresh.
      if (raw === null) return NOT_OWNER;
      const owner = ownerSchema.safeParse(JSON.parse(raw));
      if (!owner.success) return NOT_OWNER;
      if (owner.data.userId !== userId) return FORBIDDEN;
      if (owner.data.podId === podId) return NOT_OWNER;
      const receivers = await client.publish(podChannel(owner.data.podId), JSON.stringify(message));
      // Nobody listening means the owning pod is gone and its key is stale.
      return receivers > 0 ? { kind: 'relayed', channel } : NOT_OWNER;
    } catch (error) {
      warn('Could not relay a watch request', error);
      return NOT_OWNER;
    }
  }

  async function releaseOwner(cid: string): Promise<void> {
    const client = ready();
    if (!client) return;
    const release = client
      .eval(RELEASE_OWNER_SCRIPT, 1, ownerKey(cid), podId)
      .then(
        () => undefined,
        (error: unknown) => warn('Could not release stream owner', error)
      )
      .finally(() => releasing.delete(release));
    releasing.add(release);
    await release;
  }

  function pause(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const onStop = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        stopping.signal.removeEventListener('abort', onStop);
        resolve();
      }, ms);
      stopping.signal.addEventListener('abort', onStop, { once: true });
    });
  }

  async function apply(message: RelayMessage): Promise<void> {
    const cid = message.op === 'subscribe' ? message.req.clientId : message.clientId;
    // The sender already answered 202, so this request is lost; dropping the
    // key makes the next one answer 409, which reopens the client's stream.
    if (!hub.hasClient(cid)) {
      await releaseOwner(cid);
      return;
    }

    if (message.op === 'unsubscribe') {
      if (hub.isClientOwnedBy(message.clientId, message.userId)) {
        hub.unsubscribe(message.clientId, message.channel);
      }
      return;
    }

    const { req, userId } = message;
    // A forged or stale message cannot attach channels to someone else's stream.
    if (!hub.isClientOwnedBy(req.clientId, userId)) return;
    try {
      await hub.subscribe(req);
    } catch (error) {
      hub.sendSubscribeFailed(req.clientId, buildChannelKey(req), errorMessage(error));
    }
  }

  function onMessage(channel: string, raw: string): void {
    if (channel !== podChannel(podId)) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const message = relayMessageSchema.safeParse(parsed);
    if (!message.success) return;
    void apply(message.data);
  }

  return {
    registerOwner: writeOwner,

    async refreshOwners(owners) {
      const client = ready();
      if (!client) return;
      const batch = client.pipeline();
      let count = 0;
      for (const [cid, userId] of owners) {
        // Closed since the snapshot and already released; don't resurrect its key.
        if (!hub.hasClient(cid)) continue;
        batch.set(ownerKey(cid), ownerValue(userId), 'EX', OWNER_TTL_SECONDS);
        count += 1;
      }
      if (count === 0) return;
      try {
        const results = (await batch.exec()) ?? [];
        const failed = results.find(([error]) => error !== null);
        if (failed) {
          const failures = results.filter(([error]) => error !== null).length;
          warn(`Could not refresh ${failures} of ${count} stream owners`, failed[0]);
        }
      } catch (error) {
        warn(`Could not refresh ${count} stream owners`, error);
      }
    },

    releaseOwner,

    relaySubscribe(req, userId) {
      return relay(req.clientId, userId, buildChannelKey(req), { op: 'subscribe', req, userId });
    },

    relayUnsubscribe(clientId, channel, userId) {
      return relay(clientId, userId, channel, { op: 'unsubscribe', clientId, channel, userId });
    },

    async start() {
      if (!enabled || !subscriber) return;
      const channel = podChannel(podId);
      subscriber.on('message', onMessage);
      // ioredis only re-subscribes channels whose first SUBSCRIBE succeeded;
      // Redis ignores a repeated SUBSCRIBE.
      subscriber.on('ready', () => {
        subscriber.subscribe(channel).catch((error: unknown) => {
          warn('Could not subscribe to the relay channel', error);
        });
      });
      // Redis may be down at boot: retry until reachable or shutdown.
      for (let attempt = 1; !stopping.signal.aborted; attempt += 1) {
        try {
          await subscriber.subscribe(channel);
          return;
        } catch (error) {
          if (attempt === 1) warn('Could not subscribe to the relay channel, retrying', error);
          await pause(retryDelayMs(attempt));
        }
      }
    },

    async stop() {
      if (stopping.signal.aborted) return;
      stopping.abort();
      await Promise.allSettled(releasing);
      const connections = [redis, subscriber].filter((c) => c !== null);
      const closed = await Promise.allSettled(connections.map((c) => c.quit()));
      for (const result of closed) {
        if (result.status === 'rejected') warn('Could not close a relay connection', result.reason);
      }
    },
  };
}
