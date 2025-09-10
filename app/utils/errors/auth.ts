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
