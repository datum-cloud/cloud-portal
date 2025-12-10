import { AppError } from './base';

export class TokenError extends AppError {
  constructor(message: string = 'Invalid or expired token', requestId?: string) {
    super(message, 401, 'TOKEN_ERROR', requestId);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', requestId?: string) {
    super(message, 401, 'AUTH_ERROR', requestId);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Not authorized to perform this action', requestId?: string) {
    super(message, 403, 'FORBIDDEN', requestId);
  }
}

export class PermissionError extends AppError {
  constructor(
    message: string = 'You do not have permission to access this resource',
    requestId?: string
  ) {
    super(message, 403, 'PERMISSION_DENIED', requestId);
  }
}

/**
 * Refresh token error types for categorizing different failure scenarios
 */
export enum RefreshErrorType {
  /** No refresh token available in cookie */
  NO_REFRESH_TOKEN = 'NO_REFRESH_TOKEN',
  /** Refresh token has expired (Zitadel idle or absolute expiration) */
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  /** Refresh token has been revoked (logout elsewhere, security event) */
  REFRESH_TOKEN_REVOKED = 'REFRESH_TOKEN_REVOKED',
  /** Network error when communicating with Zitadel */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Unknown/unexpected error */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for refresh token failures
 * Extends AppError for consistent error handling
 */
export class RefreshError extends AppError {
  constructor(
    public type: RefreshErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message, 401, type);
    this.name = 'RefreshError';
  }
}

/**
 * Categorizes refresh errors for appropriate handling
 * Analyzes error messages to determine the type of failure
 *
 * @param error - The original error from the refresh attempt
 * @returns A categorized RefreshError
 */
export function categorizeRefreshError(error: unknown): RefreshError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  // Token revoked or invalid
  if (
    errorString.includes('invalid_grant') ||
    errorString.includes('token has been revoked') ||
    errorString.includes('refresh token is invalid')
  ) {
    return new RefreshError(
      RefreshErrorType.REFRESH_TOKEN_REVOKED,
      'Refresh token has been revoked or is invalid',
      error
    );
  }

  // Token expired
  if (errorString.includes('expired') || errorString.includes('token is no longer valid')) {
    return new RefreshError(
      RefreshErrorType.REFRESH_TOKEN_EXPIRED,
      'Refresh token has expired',
      error
    );
  }

  // Network errors
  if (
    errorString.includes('network') ||
    errorString.includes('fetch') ||
    errorString.includes('econnrefused') ||
    errorString.includes('timeout')
  ) {
    return new RefreshError(
      RefreshErrorType.NETWORK_ERROR,
      'Network error during token refresh',
      error
    );
  }

  return new RefreshError(
    RefreshErrorType.UNKNOWN_ERROR,
    `Unknown refresh error: ${errorMessage}`,
    error
  );
}
