import { AppError } from './base';

export class TokenError extends AppError {
  constructor(message: string = 'Invalid or expired token') {
    super(message, 401, 'TOKEN_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Not authorized to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}
