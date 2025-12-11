/**
 * Refresh token cookie utilities
 *
 * This module provides refresh token cookie management.
 * Core auth logic (refresh, validation) is handled by AuthService.
 */
import { AUTH_COOKIE_KEYS, AuthService, refreshTokenStorage } from '@/utils/auth';
import type { IRefreshTokenSession } from '@/utils/auth';

// Re-export for backwards compatibility
export { refreshTokenStorage };
export const REFRESH_TOKEN_KEY = AUTH_COOKIE_KEYS.REFRESH_TOKEN;

// Re-export type for backwards compatibility
export type { IRefreshTokenSession };

/**
 * Response type for refresh token operations
 */
type RefreshTokenResponse = {
  refreshToken?: string;
  headers: Headers;
};

/**
 * Sets refresh token in dedicated cookie
 * @param request Request object
 * @param refreshToken Refresh token to store
 * @returns Response with refresh token and headers
 */
export async function setRefreshToken(
  request: Request,
  refreshToken: string
): Promise<RefreshTokenResponse> {
  const headers = await AuthService.setRefreshToken(request.headers.get('Cookie'), refreshToken);
  return { refreshToken, headers };
}

/**
 * Gets refresh token from dedicated cookie
 * @param request Request object
 * @returns Response with refresh token (if exists) and headers
 */
export async function getRefreshToken(request: Request): Promise<RefreshTokenResponse> {
  const { refreshToken, rawSession } = await AuthService.getRefreshToken(
    request.headers.get('Cookie')
  );
  const cookieHeader = await refreshTokenStorage.commitSession(rawSession);

  return {
    refreshToken: refreshToken ?? undefined,
    headers: new Headers({ 'Set-Cookie': cookieHeader }),
  };
}

/**
 * Destroys refresh token cookie
 * @param request Request object
 * @returns Response with headers to destroy the cookie
 */
export async function destroyRefreshToken(request: Request): Promise<RefreshTokenResponse> {
  const headers = await AuthService.destroyRefreshToken(request.headers.get('Cookie'));
  return { refreshToken: undefined, headers };
}
