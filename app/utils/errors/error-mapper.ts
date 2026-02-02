import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ValidationError,
} from './app-error';
import { isGqlError, getGqlErrorCode, getGqlErrorMessage } from '@/modules/gqlts/errors';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  message?: string;
  code?: string;
  details?: Array<{ path: string[]; message: string }>;
}

export function mapApiError(error: unknown, requestId?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 500;
    const data = error.response?.data as ApiErrorResponse | undefined;
    const message = data?.message ?? error.message ?? 'An error occurred';

    switch (status) {
      case 400:
        return new ValidationError(message, data?.details, requestId);
      case 401:
        return new AuthenticationError(message, requestId);
      case 403:
        return new AuthorizationError(message, requestId);
      case 404:
        return new NotFoundError('Resource', undefined, requestId);
      case 409:
        return new ConflictError(message, requestId);
      case 429:
        return new RateLimitError(undefined, requestId);
      default:
        return new AppError(message, {
          code: data?.code ?? 'API_ERROR',
          status,
          requestId,
          cause: error,
        });
    }
  }

  // Handle GraphQL errors
  if (isGqlError(error)) {
    const gqlError = error.errors![0];
    const code = getGqlErrorCode(gqlError);
    const message = getGqlErrorMessage(error);

    switch (code) {
      case 'UNAUTHENTICATED':
        return new AuthenticationError(message, requestId);
      case 'FORBIDDEN':
        return new AuthorizationError(message, requestId);
      case 'NOT_FOUND':
        return new NotFoundError('Resource', undefined, requestId);
      case 'BAD_USER_INPUT':
        return new ValidationError(message, undefined, requestId);
      default:
        return new AppError(message, {
          code: code ?? 'GRAPHQL_ERROR',
          status: 500,
          requestId,
          cause: error,
        });
    }
  }

  if (error instanceof Error) {
    return new AppError(error.message, {
      code: 'INTERNAL_ERROR',
      status: 500,
      requestId,
      cause: error,
    });
  }

  return new AppError('An unexpected error occurred', {
    code: 'UNKNOWN_ERROR',
    status: 500,
    requestId,
    cause: error,
  });
}
