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
 * @see {@link WatchHub} for the server-side multiplexer engine.
 * @see {@link WatchManager} (client-side) for the browser-side counterpart.
 */
import type { Variables } from '@/server/types';
import { watchHub } from '@/server/watch/watch-hub';
import { watchSubscribeSchema, watchUnsubscribeSchema } from '@/server/watch/watch-hub.types';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

export const watchRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /api/watch/stream?cid=<clientId>
 * Opens a long-lived SSE connection for multiplexed watch events.
 * One connection per browser tab.
 */
watchRoutes.get('/stream', (c) => {
  const clientId = c.req.query('cid');
  if (!clientId) {
    return c.json({ error: 'Missing cid query parameter' }, 400);
  }

  const session = c.get('session');
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  return streamSSE(c, async (stream) => {
    const accepted = watchHub.registerClient({
      id: clientId,
      userId: session.sub,
      stream,
      subscriptions: new Set(),
      token: session.accessToken,
      lastActivity: Date.now(),
    });

    if (!accepted) {
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ message: 'Too many connections' }),
      });
      return;
    }

    // Keep connection alive until client disconnects
    stream.onAbort(() => {
      watchHub.removeClient(clientId);
    });

    // Block until aborted (Hono streamSSE pattern)
    try {
      while (true) {
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
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = watchSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: `Invalid request: ${parsed.error.issues.map((e) => e.message).join(', ')}` },
      400
    );
  }

  const req = parsed.data;

  // Validate client ownership
  if (!watchHub.isClientOwnedBy(req.clientId, session.sub)) {
    return c.json({ error: 'Client not owned by this user' }, 403);
  }

  // Update token on each subscribe (keeps auth fresh)
  watchHub.updateClientToken(req.clientId, session.accessToken);

  try {
    const channel = await watchHub.subscribe(req);
    return c.json({ channel });
  } catch (err) {
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

  // Validate client ownership
  if (!watchHub.isClientOwnedBy(req.clientId, session.sub)) {
    return c.json({ error: 'Client not owned by this user' }, 403);
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
