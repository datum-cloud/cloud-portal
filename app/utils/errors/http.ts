import { AppError } from './base';

export class HttpError extends AppError {
  constructor(
    message: string = 'An unexpected error occurred',
    status: number = 500,
    requestId?: string
  ) {
    super(message, status, 'HTTP_ERROR', requestId);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', requestId?: string) {
    super(message, 400, 'BAD_REQUEST', requestId);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', requestId?: string) {
    super(message, 404, 'NOT_FOUND', requestId);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', requestId?: string) {
    super(message, 422, 'VALIDATION_ERROR', requestId);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', requestId?: string) {
    super(message, 409, 'CONFLICT', requestId);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', requestId?: string) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', requestId);
  }
}
