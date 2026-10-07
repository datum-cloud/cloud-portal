/**
 * Refresh coordination for AuthService: the in-memory and Redis singleflight
 * locks, the encrypted Redis payloads they share, and the rotation links that
 * lead a consumed refresh token to its newest session.
 */
import { AUTH_CONFIG } from './auth.config';
import type { IAccessTokenSession } from './auth.types';
import { redisClient } from '@/modules/redis';
import { env } from '@/utils/env/env.server';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Debug logger - only logs in development
 */
export function debugLog(message: string, data?: Record<string, unknown>): void {
  if (AUTH_CONFIG.DEBUG) {
    console.log(`[AuthService] ${message}`, data ?? '');
  }
}

/**
 * In-memory refresh lock to prevent concurrent refresh attempts (fallback)
 * Key: derived refresh token key, Value: { promise, timestamp }
 *
 * This prevents race conditions when multiple concurrent requests
 * try to refresh the same token (Zitadel uses token rotation). It only
 * coordinates within a single process; the Redis singleflight below extends
 * the same guarantee across pods when REDIS_URL is configured.
 */
interface RefreshLockEntry {
  promise: Promise<{ session: IAccessTokenSession; headers: Headers }>;
  timestamp: number;
}
export const refreshLocks = new Map<string, RefreshLockEntry>();

/**
 * Max age for lock entries (30 seconds) - prevents stale locks
 */
export const LOCK_MAX_AGE_MS = 30 * 1000;

/**
 * Redis TTL for a shared refresh failure (short) - just long enough for
 * concurrent requests to pick it up. Successful rotations use
 * ROTATION_LINK_TTL_MS instead.
 */
const REDIS_RESULT_TTL_MS = 10 * 1000;

/**
 * How long a successful rotation stays linked to the refresh token it consumed.
 * Zitadel invalidates the old access token as soon as a refresh rotates, so a
 * request that started before the rotation and still holds the old refresh
 * token can follow this link to the current session instead of being signed
 * out. 60s covers slow in-flight requests without keeping tokens around long.
 */
export const ROTATION_LINK_TTL_MS = 60 * 1000;

/**
 * Most links followed past the first when looking for the newest session. A
 * request can lag a few rotations behind; the cap bounds Redis reads per
 * lookup and stops a cycle.
 */
const MAX_LINK_HOPS = 3;

/**
 * Longest a waiter will poll for the leader's result before giving up and
 * falling back to the in-memory lock. Bounds request latency well under the
 * lock TTL and replaces the previous unbounded recursion.
 */
const REDIS_WAIT_MAX_MS = 10 * 1000;

// A leader publishes either its rotated session (ok) or the categorised failure
// (err) so every concurrent waiter reuses one outcome instead of each re-hitting
// Zitadel with the same, now-rotated, refresh token.
// `next` is the lock key of the refresh token this rotation issued, so a holder
// of the old token can walk forward to the newest session.
type RedisRefreshOk = {
  kind: 'ok';
  session: IAccessTokenSession;
  setCookie: string[];
  next?: string;
};
type RedisRefreshErr = { kind: 'err'; message: string; code?: string; description?: string };
type RedisRefreshPayload = RedisRefreshOk | RedisRefreshErr;

/**
 * Signals that Redis *coordination* failed (a GET/SET/EVAL threw or timed out),
 * as opposed to the token refresh itself. The caller falls back to the in-memory
 * lock on this, so a Redis blip never propagates as a logout.
 */
export class RedisCoordinationError extends Error {}

// Published payloads carry the rotated refresh token and the access token, so
// they are encrypted at rest with a key derived from SESSION_SECRET. Cookie
// session storage signs but does not encrypt, so without this anyone with Redis
// access could read the tokens.
const resultCipherKey = createHash('sha256').update(env.server.sessionSecret).digest();

function encryptPayload(payload: RedisRefreshPayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', resultCipherKey, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

function decryptPayload(raw: string): RedisRefreshPayload | null {
  try {
    const buf = Buffer.from(raw, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', resultCipherKey, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const json = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString(
      'utf8'
    );
    return JSON.parse(json) as RedisRefreshPayload;
  } catch {
    return null;
  }
}

export function setCookiesOf(headers: Headers): string[] {
  const setCookie: string[] = [];
  headers.forEach((value, headerName) => {
    if (headerName.toLowerCase() === 'set-cookie') setCookie.push(value);
  });
  return setCookie;
}

export function okPayloadToResponse(payload: RedisRefreshOk): {
  session: IAccessTokenSession;
  headers: Headers;
} {
  const headers = new Headers();
  for (const cookie of payload.setCookie) headers.append('Set-Cookie', cookie);
  return { session: payload.session, headers };
}

export function errPayloadToError(payload: RedisRefreshErr): Error {
  const err = new Error(payload.message) as Error & { code?: string; description?: string };
  if (payload.code) err.code = payload.code;
  if (payload.description) err.description = payload.description;
  return err;
}

export function toRefreshErrPayload(error: unknown): RedisRefreshErr {
  const e = error as { message?: string; code?: string; description?: string };
  return {
    kind: 'err',
    message: e?.message ?? String(error),
    code: e?.code,
    description: e?.description,
  };
}

export function deriveRefreshLockKey(refreshToken: string): string {
  // Hash so no token material (not even a prefix) lands in a Redis key.
  return createHash('sha256').update(refreshToken).digest('hex').slice(0, 32);
}

export function isRedisReadyForLocks(): boolean {
  return !!redisClient && redisClient.status === 'ready';
}

export function redisLockKey(key: string): string {
  return `auth:refresh-lock:${key}`;
}

function redisResultKey(key: string): string {
  return `auth:refresh-result:${key}`;
}

// Reads (and decrypts) any published payload. A Redis error is surfaced as a
// RedisCoordinationError so callers fall back rather than treat it as a refresh
// failure; a corrupt/unreadable value reads as absent.
export async function readRedisPayload(key: string): Promise<RedisRefreshPayload | null> {
  if (!redisClient) return null;
  let raw: string | null;
  try {
    raw = await redisClient.get(redisResultKey(key));
  } catch (error) {
    throw new RedisCoordinationError(String(error));
  }
  return raw ? decryptPayload(raw) : null;
}

// Best-effort publish of the leader's outcome. Never throws: once the token has
// rotated, a failed publish must not strand the successful refresh.
export async function publishRedisPayload(
  key: string,
  payload: RedisRefreshPayload
): Promise<void> {
  if (!redisClient) return;
  try {
    const ttlMs = payload.kind === 'ok' ? ROTATION_LINK_TTL_MS : REDIS_RESULT_TTL_MS;
    await redisClient.set(redisResultKey(key), encryptPayload(payload), 'PX', ttlMs);
  } catch (error) {
    debugLog('Failed to publish Redis refresh payload', { error: String(error) });
  }
}

// Atomic compare-and-delete via Lua: release the lock only if we still own it.
// A WATCH/MULTI on the process-wide shared connection is not safe here — a
// concurrent UNWATCH would clear the watch and let DEL drop a lock another
// leader had since acquired. Best-effort: a failed release just waits out the TTL.
const RELEASE_LOCK_LUA =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

export async function releaseRedisLockIfOwned(key: string, lockValue: string): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.eval(RELEASE_LOCK_LUA, 1, redisLockKey(key), lockValue);
  } catch (error) {
    debugLog('Failed to release Redis refresh lock', { error: String(error) });
  }
}

// Waits (bounded) for the leader to publish its result or failure. Returns null
// if nothing arrives, the lock is gone, or Redis errors — the caller then falls
// back to the in-memory lock exactly once. No recursion.
export async function waitForRedisPayload(key: string): Promise<RedisRefreshPayload | null> {
  if (!redisClient) return null;

  const deadline = Date.now() + REDIS_WAIT_MAX_MS;
  while (Date.now() < deadline) {
    let payload: RedisRefreshPayload | null;
    try {
      payload = await readRedisPayload(key);
    } catch {
      return null;
    }
    if (payload) return payload;

    let stillLocked: number;
    try {
      stillLocked = await redisClient.exists(redisLockKey(key));
    } catch {
      return null;
    }
    if (!stillLocked) return null;

    await new Promise((r) => setTimeout(r, 75 + Math.floor(Math.random() * 75)));
  }

  return null;
}

/**
 * In-memory rotation links — the fallback when Redis is unset or unavailable.
 * Key: lock key of the consumed refresh token. Only this process can see them,
 * so a request landing on another pod falls through to a normal refresh.
 */
export const rotationLinks = new Map<string, { payload: RedisRefreshOk; expiresAt: number }>();

export function readRotationLink(key: string): RedisRefreshOk | null {
  const entry = rotationLinks.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    rotationLinks.delete(key);
    return null;
  }
  return entry.payload;
}

// Redis is the shared source when it is up; a Redis error falls back to this
// process's links rather than failing the lookup.
async function readRotationPayload(key: string): Promise<RedisRefreshPayload | null> {
  if (isRedisReadyForLocks()) {
    try {
      // A rotation made while Redis was down only exists in this process's links.
      return (await readRedisPayload(key)) ?? readRotationLink(key);
    } catch (error) {
      if (!(error instanceof RedisCoordinationError)) throw error;
    }
  }
  return readRotationLink(key);
}

// Walks `next` links from an ok payload. The refresh token a payload carries
// may itself have rotated since, and returning its cookies would write a dead
// refresh token into the browser, so callers always want the newest one.
export async function followRotations(start: RedisRefreshOk): Promise<RedisRefreshOk> {
  let newest = start;
  for (let hop = 0; hop < MAX_LINK_HOPS && newest.next; hop++) {
    const next = await readRotationPayload(newest.next);
    if (next?.kind !== 'ok') break;
    newest = next;
  }
  return newest;
}

export async function readNewestRotation(key: string): Promise<RedisRefreshOk | null> {
  const first = await readRotationPayload(key);
  if (first?.kind !== 'ok') return null;
  return followRotations(first);
}

/**
 * Cleanup old locks after a delay
 */
export function cleanupRefreshLock(key: string, delayMs: number = 5000): void {
  setTimeout(() => {
    refreshLocks.delete(key);
  }, delayMs);
}

/**
 * Cleanup stale locks (safety mechanism)
 * Called periodically to prevent memory leaks from failed cleanups
 */
function cleanupStaleLocks(): void {
  const now = Date.now();
  for (const [key, entry] of refreshLocks) {
    if (now - entry.timestamp > LOCK_MAX_AGE_MS) {
      refreshLocks.delete(key);
    }
  }
  for (const [key, entry] of rotationLinks) {
    if (now >= entry.expiresAt) {
      rotationLinks.delete(key);
    }
  }
}

// Run stale lock cleanup every 60 seconds
setInterval(cleanupStaleLocks, 60 * 1000);
