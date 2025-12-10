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
import { isProduction } from '@/utils/config/env.config';
import { categorizeRefreshError, RefreshError } from '@/utils/errors/auth';
import { combineHeaders } from '@/utils/helpers/path.helper';
import { jwtDecode } from 'jwt-decode';
import { createCookieSessionStorage, createCookie } from 'react-router';

/**
 * Session cookie configuration
 */
const sessionCookie = createCookie(AUTH_COOKIE_KEYS.SESSION, {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  httpOnly: true,
  maxAge: AUTH_CONFIG.SESSION_COOKIE_MAX_AGE,
  secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
  secure: isProduction(),
});

/**
 * Refresh token cookie configuration
 */
const refreshTokenCookie = createCookie(AUTH_COOKIE_KEYS.REFRESH_TOKEN, {
  path: '/',
  domain: process.env?.APP_URL ? new URL(process.env.APP_URL).hostname : 'localhost',
  sameSite: 'lax',
  httpOnly: true,
  maxAge: AUTH_CONFIG.REFRESH_COOKIE_MAX_AGE,
  secrets: [process.env?.SESSION_SECRET ?? 'NOT_A_STRONG_SECRET'],
  secure: isProduction(),
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
 * In-memory refresh lock to prevent concurrent refresh attempts
 * Key: refresh token prefix (first 20 chars), Value: { promise, timestamp }
 *
 * This prevents race conditions when multiple concurrent requests
 * try to refresh the same token (Zitadel uses token rotation).
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
    // Use token prefix as lock key (tokens are unique enough in first 20 chars)
    const lockKey = refreshToken.substring(0, 20);

    // Check if there's already a refresh in progress for this token
    const existingLock = refreshLocks.get(lockKey);
    if (existingLock) {
      debugLog('Refresh already in progress, waiting for result...');
      return existingLock.promise;
    }

    // Create the refresh promise
    const refreshPromise = this.doRefreshTokens(refreshToken, sessionRaw, refreshRaw);

    // Store the promise with timestamp so concurrent requests can wait for it
    refreshLocks.set(lockKey, {
      promise: refreshPromise,
      timestamp: Date.now(),
    });

    try {
      const result = await refreshPromise;
      // Cleanup lock after a short delay (allow time for response to propagate)
      cleanupRefreshLock(lockKey, 5000);
      return result;
    } catch (error) {
      // Remove lock immediately on error so next request can retry
      refreshLocks.delete(lockKey);
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

    const newSession: IAccessTokenSession = {
      accessToken: refreshedTokens.accessToken(),
      expiredAt: refreshedTokens.accessTokenExpiresAt(),
      sub: decoded.sub,
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

          // If token has enough time left (> 5 minutes), continue with current session
          // This handles both network errors and other transient failures gracefully
          const MIN_BUFFER_MS = 5 * 60 * 1000; // 5 minutes minimum buffer
          if (!isExpired && timeUntilExpiry > MIN_BUFFER_MS) {
            return { session, headers: defaultHeaders, refreshed: false };
          }

          // Token is expired - check if it's a network error (might recover on retry)
          if (refreshError instanceof RefreshError && refreshError.type === 'NETWORK_ERROR') {
            debugLog('Network error during refresh of expired token');
          }

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
   * Performs logout - revokes tokens and destroys all auth cookies
   *
   * @param cookieHeader - Cookie header from request
   * @param idToken - ID token for OIDC end_session (optional)
   * @returns Headers with Set-Cookie to destroy cookies
   */
  static async logout(cookieHeader: string | null, idToken?: string): Promise<Headers> {
    const { session } = await this.getSession(cookieHeader);
    const { refreshToken } = await this.getRefreshToken(cookieHeader);

    // 1. Revoke access token at Zitadel
    if (session?.accessToken) {
      try {
        await zitadelStrategy.revokeToken(session.accessToken);
        debugLog('Access token revoked');
      } catch (error) {
        debugLog('Failed to revoke access token', { error: String(error) });
      }
    }

    // 2. Revoke refresh token at Zitadel
    if (refreshToken) {
      try {
        await zitadelStrategy.revokeToken(refreshToken);
        debugLog('Refresh token revoked');
      } catch (error) {
        debugLog('Failed to revoke refresh token', { error: String(error) });
      }
    }

    // 3. Call OIDC end_session endpoint
    if (idToken) {
      try {
        const body = new URLSearchParams();
        body.append('id_token_hint', idToken);

        await fetch(`${zitadelIssuer}/oidc/v1/end_session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        debugLog('OIDC session ended');
      } catch (error) {
        debugLog('Failed to end OIDC session', { error: String(error) });
      }
    }

    // 4. Destroy local cookies
    const sessionHeaders = await this.destroySession(cookieHeader);
    const refreshHeaders = await this.destroyRefreshToken(cookieHeader);

    return combineHeaders(sessionHeaders, refreshHeaders);
  }
}
