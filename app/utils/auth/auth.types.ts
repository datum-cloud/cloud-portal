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
  /**
   * `email_verified` from the id_token, fixed at issue time. It only changes
   * when a new token is issued, so a caller waiting on verification must force
   * a refresh rather than re-read the session — see /verify-email.
   */
  emailVerified: boolean;
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
