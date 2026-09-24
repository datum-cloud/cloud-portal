import type { FeedbackSink } from './feedback-sink';
import type { Variables } from '@/server/types';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

const WINDOW_SECONDS = 600;
const MAX_PER_WINDOW = 5;
const MAX_BODY_BYTES = 16 * 1024;

/**
 * The subset of ioredis this route uses for an atomic per-user counter.
 * `incr` is atomic on its own; `ttl` then tells us whether the window still has
 * a deadline, so a lost `expire` can be repaired without resetting the clock.
 * Narrower than `KvLike` (get/set) on purpose: a read-then-write pair can't
 * enforce a hard limit under concurrent POSTs from the same user, since every
 * in-flight request could read the same pre-increment count and all pass.
 *
 * Deliberately avoids `EXPIRE … NX`, which needs Redis 7.0+: on an older server
 * that command errors, the key keeps no TTL, and the user is rate-limited
 * forever. `incr`/`expire`/`ttl` work on every version.
 */
export interface CounterLike {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  /** Seconds remaining, `-1` when the key has no TTL, `-2` when it is gone. */
  ttl(key: string): Promise<number>;
}

export function feedbackSchema(allowedOrigins: string[]) {
  return z.object({
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(10).max(4000),
    // Allowlist membership pins the scheme along with host and port, so there
    // is no separate protocol check: adding one would reject the http://
    // localhost origin that local development runs the website on.
    pageUrl: z.url().refine((u) => {
      try {
        return allowedOrigins.includes(new URL(u).origin);
      } catch {
        return false;
      }
    }, 'pageUrl origin not allowed'),
  });
}

/**
 * `counter` backs the per-user rate limit: Redis in production, an in-memory
 * Map in tests and when Redis is unavailable (mirrors status-cache.ts).
 */
export function createFeedbackRoutes(
  sink: FeedbackSink,
  allowedOrigins: string[],
  counter: CounterLike | null
) {
  const schema = feedbackSchema(allowedOrigins);
  const memory = new Map<string, { n: number; resetAt: number }>();
  const feedback = new Hono<{ Variables: Variables }>();

  async function overLimit(userId: string): Promise<boolean> {
    const key = `website:feedback:${userId}`;
    if (counter) {
      let n: number;
      try {
        n = await counter.incr(key);
      } catch {
        // Fail open, same convention as status-cache.ts: a counter failure
        // costs an unenforced budget for this request, not a blocked user.
        return false;
      }
      try {
        // The first increment starts the window. Later ones only re-assert the
        // TTL when it is missing, which happens if that first `expire` was lost
        // to a timeout or a crash between the two calls — without this the key
        // would never expire and the user would be limited forever. An existing
        // TTL is left alone, so the window still starts at the first request.
        if (n === 1 || (await counter.ttl(key)) < 0) {
          await counter.expire(key, WINDOW_SECONDS);
        }
      } catch {
        // The verdict below still stands on the successful `incr`.
      }
      return n > MAX_PER_WINDOW;
    }
    const now = Date.now();
    const entry = memory.get(key);
    if (!entry || entry.resetAt <= now) {
      memory.set(key, { n: 1, resetAt: now + WINDOW_SECONDS * 1000 });
      return false;
    }
    if (entry.n >= MAX_PER_WINDOW) return true;
    entry.n += 1;
    return false;
  }

  feedback.use('*', bodyLimit({ maxSize: MAX_BODY_BYTES }));

  feedback.post('/', async (c) => {
    const session = c.get('session');
    if (!session) return c.json({ error: 'unauthenticated' }, 401);
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'invalid_input' }, 400);
    if (await overLimit(session.sub)) return c.json({ error: 'rate_limited' }, 429);
    try {
      const { id } = await sink.submit({ userId: session.sub, ...parsed.data });
      return c.json({ id }, 201);
    } catch {
      return c.json({ error: 'sink_failed' }, 502);
    }
  });

  return feedback;
}
