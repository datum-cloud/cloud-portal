import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  ConflictError,
  HttpError,
  NotFoundError,
  RateLimitError,
  TokenError,
  ValidationError,
} from '@/utils/errors';
import type { AxiosError } from 'axios';

/**
 * Extract a human-friendly error message from various upstream response shapes.
 */
function extractMessage(data: unknown): string | undefined {
  if (!data) return undefined;

  if (typeof data === 'string') return data;

  if (Array.isArray(data)) {
    const first = data[0] as unknown;
    if (first && typeof first === 'object' && 'message' in (first as Record<string, unknown>)) {
      const msg = (first as { message?: string }).message;
      return msg ?? undefined;
    }
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    // Kubernetes style
    const status = obj.status as Record<string, unknown> | undefined;
    if (status) {
      const msg = (status.message as string | undefined) ?? (status.reason as string | undefined);
      if (msg) return msg;
    }

    // Common fields
    const commonKeys = [
      'message',
      'detail',
      'title',
      'error_description',
      'error',
      'description',
    ] as const;
    for (const key of commonKeys) {
      const v = obj[key as keyof typeof obj];
      if (typeof v === 'string' && v.trim()) return v;
    }

    // Validation arrays
    const possibleArrays = ['errors', 'violations', 'details'];
    for (const key of possibleArrays) {
      const v = obj[key as keyof typeof obj];
      if (Array.isArray(v) && v.length > 0) {
        const first = v[0] as unknown;
        if (first && typeof first === 'object' && 'message' in (first as Record<string, unknown>)) {
          const msg = (first as { message?: string }).message;
          if (msg) return msg;
        }
        const str = String(v[0]);
        if (str) return str;
      }
    }
  }

  return undefined;
}

function extractRequestId(error: AxiosError): string | undefined {
  const headers = (error.response?.headers ?? {}) as Record<string, string | string[]>;
  const candidates = ['x-request-id', 'x-correlation-id', 'x-requestid'];
  for (const key of candidates) {
    const val = headers[key] as string | string[] | undefined;
    if (!val) continue;
    return Array.isArray(val) ? val[0] : val;
  }
  return undefined;
}

/**
 * Map an AxiosError into a domain AppError subclass with meaningful message and status.
 */
export function mapAxiosErrorToAppError(error: AxiosError): AppError {
  // No response → network/timeout/canceled
  if (!error.response) {
    if (error.code === 'ERR_CANCELED') {
      return new HttpError('Request canceled', 499);
    }
    if (error.code === 'ECONNABORTED') {
      return new HttpError('Request timed out', 504);
    }
    return new HttpError('Network error or server unavailable', 503);
  }

  const status = error.response.status ?? 500;
  const data = error.response.data as unknown;
  const requestId = extractRequestId(error);
  const msg = extractMessage(data) ?? error.message ?? 'An unexpected error occurred';

  switch (status) {
    case 400:
      return new BadRequestError(msg, requestId);
    case 401: {
      const d = (data || {}) as Record<string, unknown>;
      if (d.error === 'access_denied' && d.error_description === 'access token invalid') {
        return new TokenError('Session expired', requestId);
      }
      return new AuthenticationError(msg, requestId);
    }
    case 403:
      return new AuthorizationError(msg, requestId);
    case 404:
      return new NotFoundError(msg, requestId);
    case 409:
      return new ConflictError(msg, requestId);
    case 422:
      return new ValidationError(msg, requestId);
    case 429:
      return new RateLimitError(msg, requestId);
    case 503:
      return new HttpError(msg || 'Service unavailable', 503, requestId);
    default:
      return new HttpError(msg, status, requestId);
  }
}
