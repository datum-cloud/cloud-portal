import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ValidationError,
  CursorExpiredError,
} from './app-error';
import { isGqlError, getGqlErrorCode, getGqlErrorMessage } from '@/modules/graphql/errors';
import { logger } from '@/modules/logger';
import { CombinedError } from '@urql/core';
import { AxiosError } from 'axios';

interface ApiErrorResponse {
  message?: string;
  code?: string;
  details?: Array<{ path: string[]; message: string }>;
}

const UPSTREAM_TIMEOUT_MESSAGE = 'The request timed out';
const UPSTREAM_ERROR_MESSAGE = 'The upstream service returned an error';

type GatewayCode = 'UPSTREAM_TIMEOUT' | 'UPSTREAM_ERROR' | 'CURSOR_EXPIRED';

function isGatewayCode(code: string | undefined): code is GatewayCode {
  return code === 'UPSTREAM_TIMEOUT' || code === 'UPSTREAM_ERROR' || code === 'CURSOR_EXPIRED';
}

/**
 * Reads the HTTP status the gateway put on `extensions.status` for an
 * `UPSTREAM_ERROR`. Accepts a numeric string too, since the value travels
 * through JSON. Only real HTTP statuses are accepted so a malformed upstream
 * value cannot be surfaced as one.
 */
function getUpstreamStatus(extensions: Record<string, unknown> | undefined): number | undefined {
  const status = extensions?.status;
  if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599) {
    return status;
  }
  if (typeof status === 'string' && /^[1-5]\d{2}$/.test(status)) {
    return Number(status);
  }
  return undefined;
}

/**
 * Logs the gateway's raw error text on the server only. The browser gets fixed
 * copy instead, so upstream hostnames and internals never reach the page.
 * `warn` avoids a second Sentry capture: the AppError constructor already owns
 * the 5xx event.
 */
function logUpstreamFailure(
  code: GatewayCode,
  message: string,
  requestId: string | undefined,
  upstreamStatus: number | undefined
): void {
  if (typeof window !== 'undefined') return;
  logger.warn(`GraphQL ${code}`, {
    requestId,
    upstreamMessage: message,
    upstreamStatus,
  });
}

/**
 * Maps the gateway codes shared by the gqlts and urql response shapes. Callers
 * gate on `isGatewayCode` so every other code stays in their own switch.
 */
function mapGatewayCode(
  code: GatewayCode,
  message: string,
  extensions: Record<string, unknown> | undefined,
  requestId: string | undefined,
  cause: unknown
): AppError {
  switch (code) {
    case 'UPSTREAM_TIMEOUT':
      logUpstreamFailure(code, message, requestId, undefined);
      return new AppError(UPSTREAM_TIMEOUT_MESSAGE, {
        code,
        status: 504,
        requestId,
        cause,
      });
    case 'UPSTREAM_ERROR': {
      const upstreamStatus = getUpstreamStatus(extensions);
      logUpstreamFailure(code, message, requestId, upstreamStatus);
      return new AppError(UPSTREAM_ERROR_MESSAGE, {
        code,
        status: 502,
        upstreamStatus,
        requestId,
        cause,
      });
    }
    case 'CURSOR_EXPIRED':
      return new CursorExpiredError(message, requestId);
  }
}

/** Maps transport-level 502/503/504/408 responses that carry no GraphQL error. */
function mapTransportStatus(
  status: number | undefined,
  message: string,
  requestId: string | undefined,
  cause: unknown
): AppError | undefined {
  if (status === 504 || status === 408) {
    return mapGatewayCode('UPSTREAM_TIMEOUT', message, undefined, requestId, cause);
  }
  if (status === 502 || status === 503) {
    return mapGatewayCode('UPSTREAM_ERROR', message, { status }, requestId, cause);
  }
  return undefined;
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
        return new AuthorizationError(message, requestId, { details: data?.details });
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

    if (isGatewayCode(code)) {
      return mapGatewayCode(code, message, gqlError.extensions, requestId, error);
    }

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

  if (error instanceof CombinedError) {
    const gqlError = error.graphQLErrors[0];
    const code = gqlError?.extensions?.code as string | undefined;
    const message = gqlError?.message ?? error.message;

    if (error.graphQLErrors.length === 0) {
      const transportError = mapTransportStatus(error.response?.status, message, requestId, error);
      if (transportError) return transportError;
    }

    if (isGatewayCode(code)) {
      return mapGatewayCode(code, message, gqlError?.extensions, requestId, error);
    }

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
