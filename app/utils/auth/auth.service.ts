/**
 * Centralized Authentication Service
 *
 * Handles:
 * - Session validation
 * - Token refresh
 * - Session restoration from refresh token
 * - Logout with token revocation
 */
import { AUTH_CONFIG, AUTH_COOKIE_KEYS } from './auth.config';
import type {
  IAccessTokenSession,
  IRefreshTokenSession,
  SessionValidationResult,
} from './auth.types';
import { zitadelIssuer, zitadelStrategy } from '@/modules/auth/strategies/zitadel.server';
import { redisClient } from '@/modules/redis';
import { env } from '@/utils/env/env.server';
import { categorizeRefreshError, RefreshError, RefreshErrorType } from '@/utils/errors/auth';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import { jwtDecode } from 'jwt-decode';
import { createCookieSessionStorage, createCookie } from 'react-router';

/**
 * Reads `email_verified` off an id_token. Absent, unparseable, or non-boolean
 * all read as false — an unverified account must never be admitted because a
 * claim could not be read.
 *
 * UNVERIFIED ASSUMPTION: that Zitadel re-issues an id_token carrying this claim
 * on the refresh_token grant. /verify-email polls by forcing a refresh, so if
 * it does not, the poll never resolves and a verified user stays blocked.
 * Confirm against staging before the gate is enabled.
 */
export function readEmailVerified(idToken: string | null | undefined): boolean {
  if (!idToken) return false;
  try {
    return jwtDecode<{ email_verified?: unknown }>(idToken).email_verified === true;
  } catch {
    return false;
  }
}

/**
 * Session cookie configuration
 */
const sessionCookie = createCookie(AUTH_COOKIE_KEYS.SESSION, {
  path: '/',
  domain: new URL(env.public.appUrl).hostname,
  sameSite: 'lax',
  httpOnly: true,
  maxAge: AUTH_CONFIG.SESSION_COOKIE_MAX_AGE,
  secrets: [env.server.sessionSecret],
  secure: env.isProd,
});

/**
 * Refresh token cookie configuration
 */
const refreshTokenCookie = createCookie(AUTH_COOKIE_KEYS.REFRESH_TOKEN, {
  path: '/',
  domain: new URL(env.public.appUrl).hostname,
  sameSite: 'lax',
  httpOnly: true,
  maxAge: AUTH_CONFIG.REFRESH_COOKIE_MAX_AGE,
  secrets: [env.server.sessionSecret],
  secure: env.isProd,
});

/**
 * Session storage
 */
export const sessionStorage = createCookieSessionStorage({
  cookie: sessionCookie,
});

/**
 * Refresh token storage
 */
export const refreshTokenStorage = createCookieSessionStorage({
  cookie: refreshTokenCookie,
});

/**
 * Debug logger - only logs in development
 */
function debugLog(message: string, data?: Record<string, unknown>): void {
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
const refreshLocks = new Map<string, RefreshLockEntry>();

/**
 * Max age for lock entries (30 seconds) - prevents stale locks
 */
const LOCK_MAX_AGE_MS = 30 * 1000;

/**
 * Redis result TTL (short) - just long enough for concurrent requests to pick it up.
 */
const REDIS_RESULT_TTL_MS = 10 * 1000;

/**
 * Longest a waiter will poll for the leader's result before giving up and
 * falling back to the in-memory lock. Bounds request latency well under the
 * lock TTL and replaces the previous unbounded recursion.
 */
const REDIS_WAIT_MAX_MS = 10 * 1000;

// A leader publishes either its rotated session (ok) or the categorised failure
// (err) so every concurrent waiter reuses one outcome instead of each re-hitting
// Zitadel with the same, now-rotated, refresh token.
type RedisRefreshOk = { kind: 'ok'; session: IAccessTokenSession; setCookie: string[] };
type RedisRefreshErr = { kind: 'err'; message: string; code?: string; description?: string };
type RedisRefreshPayload = RedisRefreshOk | RedisRefreshErr;

/**
 * Signals that Redis *coordination* failed (a GET/SET/EVAL threw or timed out),
 * as opposed to the token refresh itself. The caller falls back to the in-memory
 * lock on this, so a Redis blip never propagates as a logout.
 */
class RedisCoordinationError extends Error {}

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

function okPayloadToResponse(payload: RedisRefreshOk): {
  session: IAccessTokenSession;
  headers: Headers;
} {
  const headers = new Headers();
  for (const cookie of payload.setCookie) headers.append('Set-Cookie', cookie);
  return { session: payload.session, headers };
}

function errPayloadToError(payload: RedisRefreshErr): Error {
  const err = new Error(payload.message) as Error & { code?: string; description?: string };
  if (payload.code) err.code = payload.code;
  if (payload.description) err.description = payload.description;
  return err;
}

function toRefreshErrPayload(error: unknown): RedisRefreshErr {
  const e = error as { message?: string; code?: string; description?: string };
  return {
    kind: 'err',
    message: e?.message ?? String(error),
    code: e?.code,
    description: e?.description,
  };
}

function deriveRefreshLockKey(refreshToken: string): string {
  // Hash so no token material (not even a prefix) lands in a Redis key.
  return createHash('sha256').update(refreshToken).digest('hex').slice(0, 32);
}

function isRedisReadyForLocks(): boolean {
  return !!redisClient && redisClient.status === 'ready';
}

function redisLockKey(key: string): string {
  return `auth:refresh-lock:${key}`;
}

function redisResultKey(key: string): string {
  return `auth:refresh-result:${key}`;
}

// Reads (and decrypts) any published payload. A Redis error is surfaced as a
// RedisCoordinationError so callers fall back rather than treat it as a refresh
// failure; a corrupt/unreadable value reads as absent.
async function readRedisPayload(key: string): Promise<RedisRefreshPayload | null> {
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
async function publishRedisPayload(key: string, payload: RedisRefreshPayload): Promise<void> {
  if (!redisClient) return;
  try {
    await redisClient.set(redisResultKey(key), encryptPayload(payload), 'PX', REDIS_RESULT_TTL_MS);
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

async function releaseRedisLockIfOwned(key: string, lockValue: string): Promise<void> {
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
async function waitForRedisPayload(key: string): Promise<RedisRefreshPayload | null> {
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
 * Cleanup old locks after a delay
 */
function cleanupRefreshLock(key: string, delayMs: number = 5000): void {
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
}

// Run stale lock cleanup every 60 seconds
setInterval(cleanupStaleLocks, 60 * 1000);

/**
 * Clear user's permission cache
 * Called on logout to ensure fresh permissions on next login
 * No-op since Redis caching was removed
 */
export async function clearUserPermissionCache(_userId: string): Promise<void> {
  // No-op - Redis caching removed
  return;
}

/**
 * Authentication Service
 */
export class AuthService {
  /**
   * Checks if a session needs refresh based on expiry time
   */
  static shouldRefresh(session: IAccessTokenSession): {
    isExpired: boolean;
    isNearExpiry: boolean;
  } {
    const tokenExpiryTime = new Date(session.expiredAt).getTime();
    const currentTime = Date.now();
    const timeUntilExpiry = tokenExpiryTime - currentTime;

    return {
      isExpired: tokenExpiryTime < currentTime,
      isNearExpiry: timeUntilExpiry < AUTH_CONFIG.REFRESH_WINDOW_MS && timeUntilExpiry > 0,
    };
  }

  /**
   * Gets session data from cookie
   */
  static async getSession(cookieHeader: string | null): Promise<{
    session: IAccessTokenSession | null;
    rawSession: Awaited<ReturnType<typeof sessionStorage.getSession>>;
  }> {
    const rawSession = await sessionStorage.getSession(cookieHeader);
    const session = rawSession.get(AUTH_COOKIE_KEYS.SESSION) as IAccessTokenSession | null;
    return { session, rawSession };
  }

  /**
   * Gets refresh token from cookie
   */
  static async getRefreshToken(cookieHeader: string | null): Promise<{
    refreshToken: string | null;
    rawSession: Awaited<ReturnType<typeof refreshTokenStorage.getSession>>;
  }> {
    const rawSession = await refreshTokenStorage.getSession(cookieHeader);
    const data = rawSession.get(AUTH_COOKIE_KEYS.REFRESH_TOKEN) as IRefreshTokenSession | null;
    return { refreshToken: data?.refreshToken ?? null, rawSession };
  }

  /**
   * Attempts to refresh tokens using refresh token
   * Returns new session data and Set-Cookie headers
   *
   * Uses an in-memory lock to prevent concurrent refresh attempts
   * for the same refresh token (prevents race conditions with token rotation).
   */
  static async refreshTokens(
    refreshToken: string,
    sessionRaw: Awaited<ReturnType<typeof sessionStorage.getSession>>,
    refreshRaw: Awaited<ReturnType<typeof refreshTokenStorage.getSession>>
  ): Promise<{ session: IAccessTokenSession; headers: Headers }> {
    const key = deriveRefreshLockKey(refreshToken);

    // Prefer Redis singleflight across pods when Redis is ready. If Redis
    // *coordination* fails at any point (not the refresh itself), fall through
    // to the in-memory lock so a Redis blip never becomes a logout.
    if (isRedisReadyForLocks()) {
      try {
        return await this.refreshTokensViaRedis(key, refreshToken, sessionRaw, refreshRaw);
      } catch (error) {
        if (!(error instanceof RedisCoordinationError)) throw error;
        debugLog('Redis coordination unavailable, falling back to in-memory', {
          error: String(error),
        });
      }
    }

    return this.refreshTokensInMemory(key, refreshToken, sessionRaw, refreshRaw);
  }

  /**
   * Cross-pod singleflight. The leader rotates the token once and publishes the
   * outcome (success or failure); waiters reuse it. Throws RedisCoordinationError
   * for Redis-side failures so the caller can fall back; a genuine refresh error
   * propagates unchanged.
   */
  private static async refreshTokensViaRedis(
    key: string,
    refreshToken: string,
    sessionRaw: Awaited<ReturnType<typeof sessionStorage.getSession>>,
    refreshRaw: Awaited<ReturnType<typeof refreshTokenStorage.getSession>>
  ): Promise<{ session: IAccessTokenSession; headers: Headers }> {
    // Fast path: a fresh outcome from a concurrent refresh.
    const existing = await readRedisPayload(key);
    if (existing) {
      if (existing.kind === 'ok') {
        debugLog('Reusing Redis refresh result');
        return okPayloadToResponse(existing);
      }
      throw errPayloadToError(existing);
    }

    const lockValue = randomUUID();
    let acquired: string | null;
    try {
      acquired = await redisClient!.set(redisLockKey(key), lockValue, 'PX', LOCK_MAX_AGE_MS, 'NX');
    } catch (error) {
      throw new RedisCoordinationError(String(error));
    }

    // Waiter: wait (bounded) for the leader's outcome. No recursion — if nothing
    // arrives, fall back to the in-memory lock once via RedisCoordinationError.
    if (acquired !== 'OK') {
      debugLog('Redis refresh in progress, waiting for leader...');
      const payload = await waitForRedisPayload(key);
      if (payload?.kind === 'ok') return okPayloadToResponse(payload);
      if (payload?.kind === 'err') throw errPayloadToError(payload);
      throw new RedisCoordinationError('no leader result within wait window');
    }

    // Leader.
    let result: { session: IAccessTokenSession; headers: Headers };
    try {
      result = await this.doRefreshTokens(refreshToken, sessionRaw, refreshRaw);
    } catch (refreshError) {
      // Share the failure so waiters don't each re-hit Zitadel with the same,
      // now-consumed, token, then surface the real error.
      await publishRedisPayload(key, toRefreshErrPayload(refreshError));
      await releaseRedisLockIfOwned(key, lockValue);
      throw refreshError;
    }

    // Rotation succeeded: nothing below may throw, or a successful rotation would
    // be stranded (RT1 consumed, caller never gets RT2). Publish + release are
    // best-effort.
    const setCookie: string[] = [];
    result.headers.forEach((value, headerName) => {
      if (headerName.toLowerCase() === 'set-cookie') setCookie.push(value);
    });
    await publishRedisPayload(key, { kind: 'ok', session: result.session, setCookie });
    await releaseRedisLockIfOwned(key, lockValue);
    return result;
  }

  /**
   * In-memory singleflight — the fallback when Redis is unset or unavailable.
   * Coordinates only within a single process.
   */
  private static async refreshTokensInMemory(
    key: string,
    refreshToken: string,
    sessionRaw: Awaited<ReturnType<typeof sessionStorage.getSession>>,
    refreshRaw: Awaited<ReturnType<typeof refreshTokenStorage.getSession>>
  ): Promise<{ session: IAccessTokenSession; headers: Headers }> {
    const existingLock = refreshLocks.get(key);
    if (existingLock) {
      debugLog('Refresh already in progress (in-memory), waiting for result...');
      return existingLock.promise;
    }

    const refreshPromise = this.doRefreshTokens(refreshToken, sessionRaw, refreshRaw);
    refreshLocks.set(key, { promise: refreshPromise, timestamp: Date.now() });

    try {
      const result = await refreshPromise;
      cleanupRefreshLock(key, 5000);
      return result;
    } catch (error) {
      refreshLocks.delete(key);
      throw error;
    }
  }

  /**
   * Internal method that performs the actual token refresh
   */
  private static async doRefreshTokens(
    refreshToken: string,
    sessionRaw: Awaited<ReturnType<typeof sessionStorage.getSession>>,
    refreshRaw: Awaited<ReturnType<typeof refreshTokenStorage.getSession>>
  ): Promise<{ session: IAccessTokenSession; headers: Headers }> {
    debugLog('Attempting token refresh...');

    const refreshedTokens = await zitadelStrategy.refreshToken(refreshToken);

    // Decode new access token to get sub
    const decoded = jwtDecode<{ sub: string }>(refreshedTokens.accessToken());

    let refreshedIdToken: string | undefined;
    try {
      refreshedIdToken = refreshedTokens.idToken();
    } catch {
      refreshedIdToken = undefined;
    }

    const newSession: IAccessTokenSession = {
      accessToken: refreshedTokens.accessToken(),
      expiredAt: refreshedTokens.accessTokenExpiresAt(),
      sub: decoded.sub,
      emailVerified: readEmailVerified(refreshedIdToken),
    };

    // Update session cookie
    sessionRaw.set(AUTH_COOKIE_KEYS.SESSION, newSession);
    const sessionCookieHeader = await sessionStorage.commitSession(sessionRaw);

    // Update refresh token cookie (rotation - Zitadel issues new refresh token)
    const newRefreshData: IRefreshTokenSession = {
      refreshToken: refreshedTokens.refreshToken(),
      issuedAt: new Date(),
    };
    refreshRaw.set(AUTH_COOKIE_KEYS.REFRESH_TOKEN, newRefreshData);
    const refreshCookieHeader = await refreshTokenStorage.commitSession(refreshRaw);

    const headers = new Headers();
    headers.append('Set-Cookie', sessionCookieHeader);
    headers.append('Set-Cookie', refreshCookieHeader);

    debugLog('Token refresh successful', {
      newExpiry: newSession.expiredAt,
      sub: newSession.sub,
    });

    return { session: newSession, headers };
  }

  /**
   * Validates session and refreshes if needed
   * Main entry point for session validation
   *
   * @param cookieHeader - Cookie header from request
   * @returns Session validation result with session data and headers
   */
  static async getValidSession(cookieHeader: string | null): Promise<SessionValidationResult> {
    const { session, rawSession } = await this.getSession(cookieHeader);
    const { refreshToken, rawSession: refreshRaw } = await this.getRefreshToken(cookieHeader);

    // Commit sessions to get default headers
    const sessionCookieHeader = await sessionStorage.commitSession(rawSession);
    const refreshCookieHeader = await refreshTokenStorage.commitSession(refreshRaw);

    const defaultHeaders = new Headers();
    defaultHeaders.append('Set-Cookie', sessionCookieHeader);
    defaultHeaders.append('Set-Cookie', refreshCookieHeader);

    // Case 1: No session exists
    if (!session) {
      // Try to restore using refresh token
      if (refreshToken) {
        debugLog('No session found, attempting to restore using refresh token...');

        try {
          const { session: newSession, headers } = await this.refreshTokens(
            refreshToken,
            rawSession,
            refreshRaw
          );

          debugLog('Session restored successfully');
          return { session: newSession, headers, refreshed: true };
        } catch (error) {
          debugLog('Failed to restore session', { error: String(error) });

          const refreshError = categorizeRefreshError(error);

          // Multi-pod refresh race (cross-process): a parallel pod sharing the same
          // _refresh_token (RT1) may have already rotated it at Zitadel, leaving our
          // attempt with REFRESH_TOKEN_REVOKED / invalid_grant. This is NOT a genuine
          // logout. Do NOT destroy the refresh cookie here — destroying it would null
          // the session and push the user into the revoking logout path, which would
          // also kill the winning pod's freshly-rotated RT2. Instead, leave the existing
          // refresh cookie intact and return null without clearing it, so the browser's
          // NEXT request — carrying the rotated cookie written by the winning pod —
          // re-validates cleanly.
          //
          // Tradeoff / backstop: we never fabricate validity. We have no current access
          // token to return here (Case 1 = no _session cookie), so the session is still
          // null for THIS request; we only refrain from the destructive logout cascade.
          // A genuinely-revoked token cannot loop forever: the refresh cookie carries its
          // own maxAge (REFRESH_COOKIE_MAX_AGE) and any subsequent refresh attempt that
          // keeps failing (e.g. truly expired/revoked, not a race) will fall through to
          // REFRESH_TOKEN_EXPIRED handling, and downstream API 401s force re-eval.
          if (refreshError.type === RefreshErrorType.REFRESH_TOKEN_REVOKED) {
            console.warn(
              '[AuthService] Session restore hit REFRESH_TOKEN_REVOKED — treating as a probable ' +
                'cross-pod rotation race. Keeping refresh cookie for next-request re-validation.',
              { error: String(error) }
            );
            return { session: null, headers: defaultHeaders, refreshed: false };
          }

          console.warn(
            '[AuthService] Session restore failed — refresh token rejected. Clearing refresh cookie.',
            {
              error: String(error),
            }
          );

          // Clean up invalid refresh token
          const destroyHeader = await refreshTokenStorage.destroySession(refreshRaw);
          const headers = new Headers();
          headers.append('Set-Cookie', sessionCookieHeader);
          headers.append('Set-Cookie', destroyHeader);

          return { session: null, headers, refreshed: false };
        }
      }

      return { session: null, headers: defaultHeaders, refreshed: false };
    }

    // Case 2: Session exists - check if refresh is needed
    const { isExpired, isNearExpiry } = this.shouldRefresh(session);

    // Need to refresh
    if (isExpired || isNearExpiry) {
      if (refreshToken) {
        try {
          const { session: newSession, headers } = await this.refreshTokens(
            refreshToken,
            rawSession,
            refreshRaw
          );
          return { session: newSession, headers, refreshed: true };
        } catch (error) {
          const refreshError = categorizeRefreshError(error);
          const tokenExpiryTime = new Date(session.expiredAt).getTime();
          const timeUntilExpiry = tokenExpiryTime - Date.now();
          const minutesUntilExpiry = Math.round(timeUntilExpiry / 1000 / 60);

          // Log error with OAuth details
          const oauthCode = error instanceof Error && 'code' in error ? (error as any).code : null;
          const oauthDesc =
            error instanceof Error && 'description' in error ? (error as any).description : null;

          debugLog('Refresh failed', {
            error: oauthCode || String(error),
            description: oauthDesc,
            minutesUntilExpiry,
          });

          // If token is not yet expired, return the current session.
          // Covers multi-pod refresh races (Zitadel rotation): another pod may have already
          // rotated the refresh token (REFRESH_TOKEN_REVOKED / invalid_grant), but our
          // access token is still valid — no reason to log the user out.
          if (!isExpired) {
            return { session, headers: defaultHeaders, refreshed: false };
          }

          // Extended race tolerance: even when our access token has JUST ticked past expiry,
          // a REFRESH_TOKEN_REVOKED here is almost always a cross-pod rotation race — a
          // parallel pod sharing the same _refresh_token (RT1) already rotated it at Zitadel,
          // so our reuse is rejected. Destroying the refresh cookie + returning null here is
          // what drives the downstream redirect into the REVOKING logout(), which would also
          // kill the winning pod's freshly-rotated RT2 and bounce the user to login.
          //
          // So on this SPECIFIC error we keep the existing (just-expired) session and DO NOT
          // destroy the refresh cookie. The browser's next request carries the rotated cookie
          // the winning pod wrote, which re-validates cleanly.
          //
          // Tradeoff / backstop — we do NOT fabricate validity beyond the access token:
          // the access token's own `exp` is the bound. A genuinely-revoked (not raced) token
          // means the access token is also expired and will keep failing; the very next
          // downstream API call returns 401, forcing a fresh getValidSession evaluation, and
          // the refresh cookie's maxAge caps how long this can recur. We tolerate the race for
          // one hop without server-side-revoking tokens a parallel request may have just rotated.
          if (refreshError.type === RefreshErrorType.REFRESH_TOKEN_REVOKED) {
            console.warn(
              '[AuthService] Refresh hit REFRESH_TOKEN_REVOKED on a just-expired access token — ' +
                'treating as a probable cross-pod rotation race. Returning current session ' +
                'without revoking; next request will re-validate with the rotated cookie.',
              { minutesUntilExpiry }
            );
            return { session, headers: defaultHeaders, refreshed: false };
          }

          // Token is expired - check if it's a network error (might recover on retry)
          if (refreshError instanceof RefreshError && refreshError.type === 'NETWORK_ERROR') {
            debugLog('Network error during refresh of expired token');
          }

          console.warn(
            '[AuthService] Token refresh failed and access token is expired. User will be logged out.',
            {
              type: refreshError instanceof RefreshError ? refreshError.type : 'UNKNOWN',
              error: String(error),
            }
          );

          // Clean up invalid refresh token and return null session
          const destroyHeader = await refreshTokenStorage.destroySession(refreshRaw);
          const headers = new Headers();
          headers.append('Set-Cookie', sessionCookieHeader);
          headers.append('Set-Cookie', destroyHeader);

          return { session: null, headers, refreshed: false };
        }
      }

      // Token expired and no refresh token
      if (isExpired) {
        debugLog('Token expired and no refresh token available');
        console.warn('[AuthService] Access token expired with no refresh token available.', {
          expiredAt: session.expiredAt,
        });
        return { session: null, headers: defaultHeaders, refreshed: false };
      }
    }

    // Session is valid
    return { session, headers: defaultHeaders, refreshed: false };
  }

  /**
   * Sets session data in cookie
   */
  static async setSession(
    cookieHeader: string | null,
    sessionData: IAccessTokenSession
  ): Promise<Headers> {
    const { rawSession } = await this.getSession(cookieHeader);
    rawSession.set(AUTH_COOKIE_KEYS.SESSION, sessionData);
    const cookie = await sessionStorage.commitSession(rawSession);

    const headers = new Headers();
    headers.append('Set-Cookie', cookie);
    return headers;
  }

  /**
   * Sets refresh token in cookie
   */
  static async setRefreshToken(
    cookieHeader: string | null,
    refreshToken: string
  ): Promise<Headers> {
    const { rawSession } = await this.getRefreshToken(cookieHeader);
    const data: IRefreshTokenSession = {
      refreshToken,
      issuedAt: new Date(),
    };
    rawSession.set(AUTH_COOKIE_KEYS.REFRESH_TOKEN, data);
    const cookie = await refreshTokenStorage.commitSession(rawSession);

    const headers = new Headers();
    headers.append('Set-Cookie', cookie);
    return headers;
  }

  /**
   * Destroys session cookie
   */
  static async destroySession(cookieHeader: string | null): Promise<Headers> {
    const { rawSession } = await this.getSession(cookieHeader);
    const cookie = await sessionStorage.destroySession(rawSession);

    const headers = new Headers();
    headers.append('Set-Cookie', cookie);
    return headers;
  }

  /**
   * Destroys refresh token cookie
   */
  static async destroyRefreshToken(cookieHeader: string | null): Promise<Headers> {
    const { rawSession } = await this.getRefreshToken(cookieHeader);
    const cookie = await refreshTokenStorage.destroySession(rawSession);

    const headers = new Headers();
    headers.append('Set-Cookie', cookie);
    return headers;
  }

  /**
   * Performs logout - revokes tokens and returns the OIDC front-channel end_session URL.
   *
   * Cookie destruction is intentionally NOT done here — the route that calls this method
   * is responsible for destroying local auth cookies (via destroyLocalSessions) after
   * redirecting the browser through end_session so the Zitadel SSO cookie is cleared first.
   *
   * @param cookieHeader - Cookie header from request
   * @param idToken - ID token for OIDC end_session (optional)
   * @returns endSessionUrl — front-channel URL to 302 to (null if no idToken)
   */
  static async logout(
    cookieHeader: string | null,
    idToken?: string
  ): Promise<{ endSessionUrl: string | null }> {
    const { session } = await this.getSession(cookieHeader);
    const { refreshToken } = await this.getRefreshToken(cookieHeader);

    // 1. Clear user's permission cache from Redis
    if (session?.sub) {
      await clearUserPermissionCache(session.sub);
    }

    // 2. Revoke access token (back-channel — works without browser cookies)
    if (session?.accessToken) {
      try {
        await zitadelStrategy.revokeToken(session.accessToken);
        debugLog('Access token revoked');
      } catch (error) {
        debugLog('Failed to revoke access token', { error: String(error) });
      }
    }

    // 3. Revoke refresh token
    if (refreshToken) {
      try {
        await zitadelStrategy.revokeToken(refreshToken);
        debugLog('Refresh token revoked');
      } catch (error) {
        debugLog('Failed to revoke refresh token', { error: String(error) });
      }
    }

    // 4. Front-channel end_session: return the URL for the route to 302 to (the browser must
    //    navigate so Zitadel can clear __Host-zitadel.useragent and end the SSO session).
    return { endSessionUrl: buildEndSessionUrl(idToken) };
  }
}

/**
 * Build the front-channel OIDC end_session redirect URL. Returns null with no idToken
 * (caller falls back to local destroy). Defensive guard: client_id + post_logout_redirect_uri
 * are attached ONLY when a post-logout URI is configured — sending an unregistered URI next to
 * client_id makes Zitadel return 400. Omitting both yields Zitadel's safe default logout.
 */
export function buildEndSessionUrl(
  idToken: string | undefined,
  cfg: { issuer: string; clientId: string; postLogoutRedirectUri?: string } = {
    issuer: zitadelIssuer,
    clientId: env.server.authOidcClientId ?? '',
    postLogoutRedirectUri: env.public.authPostLogoutRedirectUri,
  }
): string | null {
  if (!idToken) return null;
  const url = new URL(`${cfg.issuer}/oidc/v1/end_session`);
  url.searchParams.set('id_token_hint', idToken);
  // Attach both together only when truthy — an empty client_id beside the URI would itself
  // trip Zitadel's 400. Omitting both is the safe default logout.
  if (cfg.clientId && cfg.postLogoutRedirectUri) {
    url.searchParams.set('client_id', cfg.clientId);
    url.searchParams.set('post_logout_redirect_uri', cfg.postLogoutRedirectUri);
  }
  return url.toString();
}
