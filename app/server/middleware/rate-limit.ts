import type { Variables } from '@/server/types';
import { RateLimitError } from '@/utils/errors/app-error';
import { createMiddleware } from 'hono/factory';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyPrefix: 'rl:',
};

// In-memory store for rate limiting
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function cleanupMemoryStore(): void {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt < now) {
      memoryStore.delete(key);
    }
  }
}

// Cleanup every minute
setInterval(cleanupMemoryStore, 60 * 1000);

export function rateLimiter(config: Partial<RateLimitConfig> = {}) {
  const { windowMs, maxRequests, keyPrefix } = { ...DEFAULT_CONFIG, ...config };

  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const session = c.get('session');
    const ip = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ?? 'unknown';

    // Use user ID if authenticated, otherwise use IP
    const identifier = session?.sub ?? ip;
    const key = `${keyPrefix}${identifier}`;

    const now = Date.now();
    const windowEnd = now + windowMs;

    // Use in-memory store
    let entry = memoryStore.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 1, resetAt: windowEnd };
      memoryStore.set(key, entry);
    } else {
      entry.count++;
    }

    const remaining = Math.max(0, maxRequests - entry.count);
    const resetAt = Math.ceil(entry.resetAt / 1000);

    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetAt));

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new RateLimitError(retryAfter, c.get('requestId'));
    }

    await next();
  });
}
