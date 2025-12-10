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
   */
  static async refreshTokens(
    refreshToken: string,
    sessionRaw: Awaited<ReturnType<typeof sessionStorage.getSession>>,
    refreshRaw: Awaited<ReturnType<typeof refreshTokenStorage.getSession>>
  ): Promise<{ session: IAccessTokenSession; headers: Headers }> {
    debugLog('Attempting token refresh...', {
      refreshTokenPrefix: refreshToken?.substring(0, 20) + '...',
      refreshTokenLength: refreshToken?.length,
      refreshTokenType: typeof refreshToken,
      refreshTokenHasWhitespace: /\s/.test(refreshToken || ''),
      refreshTokenStartsWithBearer: refreshToken?.startsWith('Bearer '),
    });

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

          // Log full error details for debugging
          const errorDetails: Record<string, unknown> = {
            message: String(error),
            isExpired,
            isNearExpiry,
            minutesUntilExpiry,
          };

          if (error instanceof Error) {
            errorDetails.name = error.name;
            errorDetails.stack = error.stack;
            // Check for OAuth2RequestError from arctic library
            if ('code' in error) errorDetails.oauthCode = (error as any).code;
            if ('description' in error) errorDetails.oauthDescription = (error as any).description;
            if ('uri' in error) errorDetails.oauthUri = (error as any).uri;
            if ('state' in error) errorDetails.oauthState = (error as any).state;
            // Check for other error details
            if ('cause' in error) errorDetails.cause = error.cause;
            if ('response' in error) errorDetails.response = (error as any).response;
            if ('body' in error) errorDetails.body = (error as any).body;
            if ('status' in error) errorDetails.status = (error as any).status;
          }

          debugLog('Refresh failed - full error details', errorDetails);

          // If token has enough time left (> 5 minutes), continue with current session
          // This handles both network errors and other transient failures gracefully
          const MIN_BUFFER_MS = 5 * 60 * 1000; // 5 minutes minimum buffer
          if (!isExpired && timeUntilExpiry > MIN_BUFFER_MS) {
            debugLog('Token has sufficient time remaining, continuing with current session', {
              minutesUntilExpiry,
            });
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
