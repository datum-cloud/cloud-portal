/**
 * Watch API routes — four endpoints that form the server-side of the
 * multiplexed watch protocol:
 *
 * 1. `GET  /api/watch/stream`      — long-lived SSE connection (one per browser tab)
 * 2. `POST /api/watch/subscribe`   — subscribe a client to a K8s resource watch
 * 3. `POST /api/watch/unsubscribe` — unsubscribe a client from a watch channel
 * 4. `GET  /api/watch/stats`       — debug endpoint (dev only)
 *
 * All endpoints require a valid session. Subscribe/unsubscribe additionally
 * validate that the requesting user owns the client connection and use Zod
 * schemas for runtime request body validation.
 *
 * Requests for a stream another pod holds go through the watch relay; 409
 * `not-owner` (relay off, Redis down, no owner) makes the client reopen its stream.
 *
 * @see {@link WatchHub} for the server-side multiplexer engine.
 * @see {@link WatchManager} (client-side) for the browser-side counterpart.
 */
import { countWatchSubscribe } from '@/server/observability/watch-metrics';
import type { Variables } from '@/server/types';
import { watchHub, watchRelay } from '@/server/watch';
import type { WatchHub } from '@/server/watch/watch-hub';
import {
  clientIdSchema,
  watchSubscribeSchema,
  watchUnsubscribeSchema,
} from '@/server/watch/watch-hub.types';
import type { RelayResult, WatchRelay } from '@/server/watch/watch-relay';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

export interface WatchRouteDeps {
  hub: WatchHub;
  relay: Pick<WatchRelay, 'relaySubscribe' | 'relayUnsubscribe'>;
}

function relayResponse(c: Context<{ Variables: Variables }>, result: RelayResult) {
  switch (result.kind) {
    case 'relayed':
      return c.json({ channel: result.channel, relayed: true }, 202);
    case 'forbidden':
      return c.json({ error: 'Client not owned by this user' }, 403);
    case 'not_owner':
      return c.json({ error: 'not-owner' }, 409);
  }
}

export function createWatchRoutes({ hub: watchHub, relay }: WatchRouteDeps) {
  const watchRoutes = new Hono<{ Variables: Variables }>();

  /**
   * GET /api/watch/stream?cid=<clientId>
   * Opens a long-lived SSE connection for multiplexed watch events.
   * One connection per browser tab.
   */
  watchRoutes.get('/stream', (c) => {
    const clientId = c.req.query('cid');
    if (!clientId || !clientIdSchema.safeParse(clientId).success) {
      return c.json({ error: 'Missing or invalid cid query parameter' }, 400);
    }

    const session = c.get('session');
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Another user's stream with this ID stays put; only a guessed or copied ID lands here.
    if (watchHub.hasClient(clientId) && !watchHub.isClientOwnedBy(clientId, session.sub)) {
      return c.json({ error: 'Client ID in use' }, 409);
    }

    return streamSSE(c, async (stream) => {
      const result = watchHub.registerClient({
        id: clientId,
        userId: session.sub,
        stream,
        subscriptions: new Set(),
        token: session.accessToken,
        lastActivity: Date.now(),
      });

      // `conflict` repeats the check above for a stream another user opened
      // while this response was starting.
      if (result !== 'accepted') {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            message: result === 'full' ? 'Too many connections' : 'Client ID in use',
          }),
        });
        return;
      }

      // Passing the stream means a stale abort cannot evict a reconnected client.
      stream.onAbort(() => {
        watchHub.removeClient(clientId, stream);
      });

      // Block until aborted (Hono streamSSE pattern)
      try {
        while (!stream.aborted) {
          await stream.sleep(60000);
        }
      } catch {
        // Stream aborted — expected on client disconnect
      }
    });
  });

  /**
   * POST /api/watch/subscribe
   * Subscribe a connected client to a K8s resource watch.
   * Request body is validated against {@link watchSubscribeSchema}.
   */
  watchRoutes.post('/subscribe', async (c) => {
    const session = c.get('session');
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      countWatchSubscribe('invalid');
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = watchSubscribeSchema.safeParse(body);
    if (!parsed.success) {
      countWatchSubscribe('invalid');
      return c.json(
        { error: `Invalid request: ${parsed.error.issues.map((e) => e.message).join(', ')}` },
        400
      );
    }

    const req = parsed.data;

    if (!watchHub.isClientOwnedBy(req.clientId, session.sub)) {
      if (watchHub.hasClient(req.clientId)) {
        countWatchSubscribe('forbidden');
        return c.json({ error: 'Client not owned by this user' }, 403);
      }
      // Tokens never cross Redis, so the owner keeps its stream's token; on
      // expiry a 401 triggers an `auth` resync and the client reopens.
      const result = await relay.relaySubscribe(req, session.sub);
      countWatchSubscribe(result.kind);
      return relayResponse(c, result);
    }

    // Update token on each subscribe (keeps auth fresh)
    watchHub.updateClientToken(req.clientId, session.accessToken);

    try {
      const channel = await watchHub.subscribe(req);
      countWatchSubscribe('local');
      return c.json({ channel });
    } catch (err) {
      countWatchSubscribe('invalid');
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  /**
   * POST /api/watch/unsubscribe
   * Unsubscribe a connected client from a watch channel.
   * Request body is validated against {@link watchUnsubscribeSchema}.
   */
  watchRoutes.post('/unsubscribe', async (c) => {
    const session = c.get('session');
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = watchUnsubscribeSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: `Invalid request: ${parsed.error.issues.map((e) => e.message).join(', ')}` },
        400
      );
    }

    const req = parsed.data;

    if (!watchHub.isClientOwnedBy(req.clientId, session.sub)) {
      if (watchHub.hasClient(req.clientId)) {
        return c.json({ error: 'Client not owned by this user' }, 403);
      }
      return relayResponse(c, await relay.relayUnsubscribe(req.clientId, req.channel, session.sub));
    }

    watchHub.unsubscribe(req.clientId, req.channel);
    return c.json({ ok: true });
  });

  /**
   * GET /api/watch/stats
   * Debug endpoint for monitoring watch connections (development only).
   * Returns client count, upstream count, and per-channel subscriber counts.
   */
  if (process.env.NODE_ENV === 'development') {
    watchRoutes.get('/stats', (c) => {
      return c.json(watchHub.getStats());
    });
  }

  return watchRoutes;
}

export const watchRoutes = createWatchRoutes({ hub: watchHub, relay: watchRelay });
