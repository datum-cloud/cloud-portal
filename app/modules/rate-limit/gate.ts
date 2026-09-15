import {
  RATE_LIMIT_BUCKETS,
  resolveTrafficClass,
  type RateLimitBucket,
} from '@/utils/rate-limit/traffic-class';

/**
 * Client-side memory of `Retry-After` windows, per bucket. Every transport
 * that reaches /api consults it before sending, so a paused class fails fast
 * locally instead of piling more requests onto an exhausted window.
 * See datum-cloud/cloud-portal#1543.
 */
const pausedUntil = new Map<RateLimitBucket, number>();

const DEFAULT_RETRY_AFTER_SEC = 60;

export function notePaused(
  bucket: RateLimitBucket,
  retryAfterSeconds: number,
  now: number = Date.now()
): void {
  pausedUntil.set(bucket, now + Math.max(1, retryAfterSeconds) * 1000);
}

/** Remaining pause in whole seconds for a path, 0 when it may be sent. */
export function pausedFor(path: string, now: number = Date.now()): number {
  const cls = resolveTrafficClass(path);
  const until = Math.max(
    pausedUntil.get(cls) ?? 0,
    pausedUntil.get('ceiling') ?? 0,
    pausedUntil.get('penalty') ?? 0
  );
  return until > now ? Math.ceil((until - now) / 1000) : 0;
}

export function resetRateLimitGate(): void {
  pausedUntil.clear();
}

export function parseRetryAfter(
  value: string | null | undefined,
  fallback: number = DEFAULT_RETRY_AFTER_SEC
): number {
  const seconds = parseInt(value ?? '', 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : fallback;
}

export function bucketFromHeader(value: string | null | undefined): RateLimitBucket {
  return RATE_LIMIT_BUCKETS.includes(value as RateLimitBucket)
    ? (value as RateLimitBucket)
    : 'interactive';
}

/** Records a 429 response's window on the gate. */
export function noteRateLimitedResponse(headers: { get(name: string): string | null }): void {
  notePaused(
    bucketFromHeader(headers.get('X-RateLimit-Class')),
    parseRetryAfter(headers.get('Retry-After'))
  );
}
