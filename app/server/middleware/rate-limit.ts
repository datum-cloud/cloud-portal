import { redisClient } from '@/modules/redis';
import type { Variables } from '@/server/types';
import { RateLimitError } from '@/utils/errors/app-error';
import type { Context } from 'hono';
import { rateLimiter as honoRateLimiter } from 'hono-rate-limiter';
import { RedisStore } from 'rate-limit-redis';
import type { RedisReply } from 'rate-limit-redis';

// ============================================================================
// IP Detection & Key Generation
// ============================================================================

/**
 * Trusted proxy headers in order of preference.
 * Only trust these headers when running behind a known load balancer.
 */
const PROXY_HEADERS = [
  'CF-Connecting-IP', // Cloudflare
  'X-Real-IP', // Nginx
  'X-Forwarded-For', // Standard (take first IP)
] as const;

/**
 * Extract client IP address from request headers.
 * Handles various proxy configurations safely.
 */
function getClientIP(c: Context<{ Variables: Variables }>): string {
  // In development, trust any header for easier testing
  const isDev = process.env.NODE_ENV === 'development';

  // Try each proxy header in order of trust
  for (const header of PROXY_HEADERS) {
    const value = c.req.header(header);
    if (value) {
      // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
      // The first one is the original client IP
      const ip = header === 'X-Forwarded-For' ? value.split(',')[0]?.trim() : value.trim();

      if (ip && isValidIP(ip)) {
        return ip;
      }
    }
  }

  // Fallback: In production without proxy headers, we can't reliably get the IP
  // Use a placeholder that won't provide per-user limiting but prevents crashes
  if (!isDev) {
    console.warn('[rate-limit] Could not determine client IP, using fallback');
  }

  return 'unknown';
}

/**
 * Basic IP validation to prevent header injection attacks.
 */
function isValidIP(ip: string): boolean {
  // IPv4: 1.2.3.4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6: simplified check for common formats
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  if (ipv4Regex.test(ip)) {
    // Validate each octet is 0-255
    return ip.split('.').every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Regex.test(ip);
}

/**
 * Default key generator: uses user ID if authenticated, otherwise IP.
 */
function defaultKeyGenerator(c: Context<{ Variables: Variables }>): string {
  const session = c.get('session');
  return session?.sub ?? getClientIP(c);
}

// ============================================================================
// Custom Handler for RateLimitError Integration
// ============================================================================

/**
 * Custom handler that throws our RateLimitError instead of returning default response.
 * This maintains compatibility with our existing error handling system.
 */
function customRateLimitHandler(c: Context<{ Variables: Variables }>) {
  const retryAfter = c.res.headers.get('Retry-After');
  const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
  const requestId = c.get('requestId');

  throw new RateLimitError(retryAfterSeconds, requestId);
}

// ============================================================================
// Rate Limit Presets
// ============================================================================

/**
 * Preset configurations for different use cases.
 *
 * Note: hono-rate-limiter uses fixed window algorithm (not sliding window).
 * This is slightly less accurate at window boundaries but more performant
 * and works consistently across distributed systems (e.g., with Redis).
 */
export const RateLimitPresets = {
  /** Standard API endpoints - 100 requests per minute */
  standard: {
    windowMs: 60 * 1000,
    limit: 100,
    keyGenerator: defaultKeyGenerator,
    standardHeaders: 'draft-6' as const,
    handler: customRateLimitHandler,
    // Use Redis if available, otherwise in-memory
    ...(redisClient && {
      store: new RedisStore({
        sendCommand: async (command: string, ...args: string[]) =>
          redisClient!.call(command, ...args) as Promise<RedisReply>,
      }) as any,
    }),
  },

  /** Development mode - 10,000 requests per minute */
  development: {
    windowMs: 60 * 1000,
    limit: 10000,
    keyGenerator: defaultKeyGenerator,
    standardHeaders: 'draft-6' as const,
    handler: customRateLimitHandler,
    // Always in-memory for faster dev loop
  },
} as const;

// ============================================================================
// Rate Limiter Middleware
// ============================================================================

/**
 * Creates a rate limiting middleware with configurable options.
 *
 * This is now powered by hono-rate-limiter, which provides:
 * - Fixed window rate limiting (performant and Redis-compatible)
 * - IETF standard rate limit headers
 * - Easy Redis/Cloudflare KV integration (when needed)
 * - Community-maintained and battle-tested
 *
 * @example
 * // Standard rate limiting
 * app.use('/api/*', rateLimiter());
 *
 * @example
 * // With preset
 * app.use('/api/proxy/*', rateLimiter(RateLimitPresets.proxy));
 *
 * @example
 * // Custom configuration
 * app.use('/api/auth/*', rateLimiter({
 *   limit: 10,
 *   windowMs: 60_000,
 *   keyGenerator: (c) => c.req.header('X-API-Key') ?? 'anonymous',
 * }));
 *
 * @example
 * // Skip rate limiting for certain requests
 * app.use('/api/*', rateLimiter({
 *   ...RateLimitPresets.standard,
 *   skip: (c) => c.get('isAdmin') === true,
 * }));
 */
export function rateLimiter(
  config: Partial<(typeof RateLimitPresets)[keyof typeof RateLimitPresets]> = {}
) {
  const finalConfig = {
    ...RateLimitPresets.standard,
    ...config,
  };

  return honoRateLimiter<{ Variables: Variables }>(finalConfig);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a composite rate limiter that applies multiple limits.
 * Useful for applying both per-user and per-IP limits.
 *
 * @example
 * // Apply both user-based and IP-based rate limiting
 * app.use('/api/*', compositeRateLimiter([
 *   { ...RateLimitPresets.standard }, // User-based (default keyGenerator uses session.sub)
 *   {
 *     ...RateLimitPresets.relaxed,
 *     keyGenerator: (c) => `ip:${getClientIP(c)}` // IP-based with prefix
 *   },
 * ]));
 */
export function compositeRateLimiter(configs: Partial<(typeof RateLimitPresets)['standard']>[]) {
  const limiters = configs.map((config) => rateLimiter(config));

  return async (c: Context<{ Variables: Variables }>, next: () => Promise<void>) => {
    // Apply all rate limiters in sequence
    // If any throws RateLimitError, it will propagate
    for (const limiter of limiters) {
      await limiter(c, async () => {
        // No-op, we'll call next() after all limiters pass
      });
    }

    await next();
  };
}
