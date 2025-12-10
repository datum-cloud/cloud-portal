/**
 * Centralized authentication configuration
 *
 * All auth-related settings in one place for easy maintenance
 */
export const AUTH_CONFIG = {
  /**
   * Refresh token when access token expires within this window
   * Default: 1 hour before expiry
   */
  REFRESH_WINDOW_MS: 60 * 60 * 1000,

  /**
   * Session cookie lifetime (slightly longer than access token)
   * Default: 13 hours (access token is 12 hours)
   */
  SESSION_COOKIE_MAX_AGE: 60 * 60 * 13,

  /**
   * Refresh token cookie lifetime
   * Should match Zitadel's idle refresh token expiration
   * Default: 30 days
   */
  REFRESH_COOKIE_MAX_AGE: 60 * 60 * 24 * 30,

  /**
   * Enable debug logging for auth operations
   */
  DEBUG: process.env.NODE_ENV === 'development',
} as const;

/**
 * Auth-related cookie keys
 */
export const AUTH_COOKIE_KEYS = {
  SESSION: '_session',
  REFRESH_TOKEN: '_refresh_token',
  ID_TOKEN: '_id_token',
} as const;
