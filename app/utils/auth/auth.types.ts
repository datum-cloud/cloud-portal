/**
 * Centralized authentication types
 */

/**
 * Full auth session returned from OAuth callback
 * Used during initial authentication flow
 */
export interface IAuthSession {
  accessToken: string;
  idToken?: string;
  refreshToken?: string | null;
  expiredAt: Date;
}

/**
 * Access token session data (stored in short-lived session cookie)
 * This is what gets stored in the _session cookie
 */
export interface IAccessTokenSession {
  accessToken: string;
  expiredAt: Date;
  sub: string;
}

/**
 * Refresh token session data (stored in long-lived refresh cookie)
 * This is what gets stored in the _refresh_token cookie
 */
export interface IRefreshTokenSession {
  refreshToken: string;
  issuedAt: Date;
}

/**
 * Result of session validation/refresh operations
 */
export interface SessionValidationResult {
  /** The validated/refreshed session, or null if invalid */
  session: IAccessTokenSession | null;
  /** Headers to set (contains Set-Cookie if refreshed) */
  headers: Headers;
  /** Whether a refresh was performed */
  refreshed: boolean;
}

/**
 * API context for route loaders/actions
 */
export interface ApiContext {
  controlPlaneClient: unknown;
  iamResourceClient: unknown;
}
