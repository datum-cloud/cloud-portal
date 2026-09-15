import {
  createMemoryPenaltyBox,
  createRedisPenaltyBox,
  type PenaltyBox,
} from './rate-limit-penalty';
import { createRateLimitStore, type RedisLike } from './rate-limit-store';
import { logger } from '@/modules/logger';
import { redisClient } from '@/modules/redis';
import {
  apiNonBrowserRequestsTotal,
  rateLimitPenaltiesTotal,
  rateLimitRejectionsTotal,
} from '@/server/observability/rate-limit-metrics';
import type { Variables } from '@/server/types';
import { AuthorizationError, RateLimitError } from '@/utils/errors/app-error';
import {
  resolveRouteGroup,
  resolveTrafficClass,
  type RateLimitBucket,
} from '@/utils/rate-limit/traffic-class';
import type { Context, MiddlewareHandler } from 'hono';
import { rateLimiter as honoRateLimiter } from 'hono-rate-limiter';

type Ctx = Context<{ Variables: Variables }>;

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
    logger.warn('[rate-limit] Could not determine client IP, using fallback');
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
// Budgets & profile
// ============================================================================

export interface RateLimitBudgets {
  windowMs: number;
  machine: number;
  interactive: number;
  ceiling: number;
}

/**
 * Per-user budgets per minute. One busy tab generates about 40 machine
 * requests a minute, so five tabs fit under 600 with headroom. Interactive
 * traffic never exceeded 100 on its own. The ceiling is the only bucket that
 * can throttle a legitimate user and is what the penalty box watches.
 * See datum-cloud/cloud-portal#1543.
 */
export const RATE_LIMIT_BUDGETS = {
  standard: { windowMs: 60_000, machine: 600, interactive: 300, ceiling: 1500 },
  development: { windowMs: 60_000, machine: 10_000, interactive: 10_000, ceiling: 10_000 },
} as const satisfies Record<string, RateLimitBudgets>;

export type RateLimitProfile = keyof typeof RATE_LIMIT_BUDGETS;

/** `RATE_LIMIT_PROFILE` wins; otherwise production is standard and everything else development. */
export function resolveRateLimitProfile(
  env: Record<string, string | undefined> = process.env
): RateLimitProfile {
  const requested = env.RATE_LIMIT_PROFILE;
  if (requested === 'standard' || requested === 'development') return requested;
  return env.NODE_ENV === 'production' ? 'standard' : 'development';
}

// ============================================================================
// Browser origin signal
// ============================================================================

/**
 * Browsers send `Sec-Fetch-Site: same-origin` on every same-origin fetch and
 * EventSource request; scripts and command-line clients do not. Older
 * browsers without fetch metadata are recognised by Origin matching Host.
 */
export function hasBrowserOrigin(c: Ctx): boolean {
  const site = c.req.header('Sec-Fetch-Site');
  if (site) return site === 'same-origin';
  const origin = c.req.header('Origin');
  const host = c.req.header('Host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// ============================================================================
// Traffic class limiter
// ============================================================================

export interface TrafficClassLimiterOptions {
  /** Defaults to resolveRateLimitProfile(). */
  profile?: RateLimitProfile;
  /** Overrides the profile's budgets; tests use tiny numbers. */
  budgets?: RateLimitBudgets;
  /** Defaults to the app's redisClient; pass null to force memory. */
  redis?: RedisLike | null;
  penaltyBox?: PenaltyBox;
  /** Defaults to RATE_LIMIT_ENFORCE_BROWSER_ORIGIN === 'true'. */
  enforceBrowserOrigin?: boolean;
}

const CLASS_HEADER = 'X-RateLimit-Class';

/** A flood is hundreds of rejections a second; one warn line per subject per interval is enough. */
const REJECTION_LOG_INTERVAL_MS = 10_000;
/** Bound on remembered subjects; cleared wholesale when reached, which only costs a few extra lines. */
const REJECTION_LOG_MAX_SUBJECTS = 10_000;
const lastRejectionLogAt = new Map<string, number>();

/** True when a rejection for `subject` should be logged now; samples to one line per interval. */
export function shouldLogRejection(subject: string, now: number = Date.now()): boolean {
  const last = lastRejectionLogAt.get(subject);
  if (last !== undefined && now - last < REJECTION_LOG_INTERVAL_MS) return false;
  if (lastRejectionLogAt.size >= REJECTION_LOG_MAX_SUBJECTS) lastRejectionLogAt.clear();
  lastRejectionLogAt.set(subject, now);
  return true;
}

function retryAfterSeconds(c: Ctx, fallback = 60): number {
  const header = c.res.headers.get('Retry-After');
  const parsed = header ? parseInt(header, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * One limiter per bucket, built once. The middleware runs the ceiling bucket
 * then the class bucket, so the class headers (the tighter ones) win.
 */
export function trafficClassLimiter(
  options: TrafficClassLimiterOptions = {}
): MiddlewareHandler<{ Variables: Variables }> {
  const profile = options.profile ?? resolveRateLimitProfile();
  const budgets = options.budgets ?? RATE_LIMIT_BUDGETS[profile];
  const redis = options.redis === undefined ? redisClient : options.redis;
  const penaltyBox =
    options.penaltyBox ?? (redis ? createRedisPenaltyBox(redis) : createMemoryPenaltyBox());
  const enforceBrowserOrigin =
    options.enforceBrowserOrigin ?? process.env.RATE_LIMIT_ENFORCE_BROWSER_ORIGIN === 'true';

  const reject = async (c: Ctx, bucket: RateLimitBucket, retryAfter: number): Promise<never> => {
    const route = resolveRouteGroup(c.req.path);
    const subject = defaultKeyGenerator(c);
    c.header(CLASS_HEADER, bucket);
    rateLimitRejectionsTotal.inc({ class: bucket, route });

    let penalised = false;
    if (bucket === 'ceiling') {
      penalised = await penaltyBox.recordTrip(subject);
      if (penalised) rateLimitPenaltiesTotal.inc();
    }

    // The counter carries the volume; the log carries the signals. A new
    // penalty is always worth a line, everything else is sampled per subject.
    if (penalised || shouldLogRejection(subject)) {
      logger.warn('[rate-limit] request rejected', {
        requestId: c.get('requestId'),
        sub: c.get('session')?.sub,
        class: bucket,
        route,
        path: c.req.path,
        clientIp: getClientIP(c),
        userAgent: c.req.header('User-Agent'),
        browserOrigin: hasBrowserOrigin(c),
        retryAfter,
        penalised,
      });
    }

    throw new RateLimitError(retryAfter, c.get('requestId'));
  };

  const limiterFor = (bucket: Exclude<RateLimitBucket, 'penalty'>) =>
    honoRateLimiter<{ Variables: Variables }>({
      windowMs: budgets.windowMs,
      limit: budgets[bucket],
      keyGenerator: (c: Ctx) => `${bucket}:${defaultKeyGenerator(c)}`,
      standardHeaders: 'draft-6',
      store: createRateLimitStore('ratelimit:', redis),
      handler: (c: Ctx) => reject(c, bucket, retryAfterSeconds(c)),
    } as never);

  const limiters = {
    ceiling: limiterFor('ceiling'),
    machine: limiterFor('machine'),
    interactive: limiterFor('interactive'),
  };

  return async (c, next) => {
    const path = c.req.path;
    const cls = resolveTrafficClass(path);

    if (!hasBrowserOrigin(c)) {
      const route = resolveRouteGroup(path);
      apiNonBrowserRequestsTotal.inc({ route });
      logger.debug('[rate-limit] request without browser fetch metadata', {
        requestId: c.get('requestId'),
        route,
        userAgent: c.req.header('User-Agent'),
      });
      if (enforceBrowserOrigin) {
        throw new AuthorizationError('Browser origin required', c.get('requestId'));
      }
    }

    const penalty = await penaltyBox.remaining(defaultKeyGenerator(c));
    if (penalty > 0) await reject(c, 'penalty', penalty);

    c.header(CLASS_HEADER, cls);
    await limiters.ceiling(c as never, async () => {});
    await limiters[cls](c as never, next);
  };
}

// ============================================================================
// Single-bucket limiter for route-level use
// ============================================================================

export interface RateLimiterConfig {
  windowMs?: number;
  limit?: number;
  keyGenerator?: (c: Ctx) => string;
  skip?: (c: Ctx) => boolean;
}

/**
 * A plain fixed-window limiter for a single route group, on the same
 * fail-open store. Not mounted anywhere today; kept for endpoints that need a
 * budget of their own, e.g. `api.use('/assistant-chat/*', rateLimiter({ limit: 20 }))`.
 */
export function rateLimiter(
  config: RateLimiterConfig = {}
): MiddlewareHandler<{ Variables: Variables }> {
  return honoRateLimiter<{ Variables: Variables }>({
    windowMs: config.windowMs ?? 60_000,
    limit: config.limit ?? 100,
    keyGenerator: (c: Ctx) => (config.keyGenerator ?? defaultKeyGenerator)(c),
    skip: config.skip ? (c: Ctx) => config.skip!(c) : undefined,
    standardHeaders: 'draft-6',
    store: createRateLimitStore('ratelimit:route:', redisClient),
    handler: (c: Ctx) => {
      throw new RateLimitError(retryAfterSeconds(c), c.get('requestId'));
    },
  } as never) as unknown as MiddlewareHandler<{ Variables: Variables }>;
}
