/**
 * Sentry Error Capture
 *
 * Utilities for capturing errors and adding breadcrumbs to Sentry.
 */
import * as Sentry from '@sentry/react-router';
import { parseResourceFromUrl, setResourceContextFromUrl } from './context/resource';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_TO_SENTRY: Record<LogLevel, Sentry.SeverityLevel> = {
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
};

/**
 * Add a breadcrumb to Sentry.
 * Debug level is skipped to avoid noise.
 */
export function addBreadcrumb(
  level: LogLevel,
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  if (level === 'debug') return;

  Sentry.addBreadcrumb({
    category,
    message,
    level: LEVEL_TO_SENTRY[level],
    data,
  });
}

/**
 * Capture an error to Sentry with additional context.
 */
export function captureError(
  error: Error,
  context?: {
    message?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): void {
  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    if (context?.extra) {
      scope.setExtras(context.extra);
    }
    scope.setLevel('error');
    Sentry.captureException(error, {
      extra: context?.message ? { message: context.message } : undefined,
    });
  });
}

/**
 * Capture a message to Sentry.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): void {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set a custom tag in Sentry.
 */
export function setTag(key: string, value: string | number | boolean | undefined): void {
  Sentry.setTag(key, value);
}

/**
 * Set a custom context in Sentry.
 */
export function setContext(name: string, context: Record<string, unknown> | null): void {
  Sentry.setContext(name, context);
}

/**
 * Options for capturing API errors.
 */
export interface CaptureApiErrorOptions {
  /** The original error (e.g., AxiosError) */
  error: Error;
  /** HTTP method (GET, POST, etc.) */
  method?: string;
  /** Request URL */
  url?: string;
  /** HTTP status code */
  status?: number | string;
  /** Error message from response */
  message?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Additional tags */
  tags?: Record<string, string>;
  /** Additional context data */
  extra?: Record<string, unknown>;
}

/**
 * Capture an API error to Sentry with proper grouping and context.
 *
 * Features:
 * - Parses resource info from URL for context
 * - Sets resource tags (apiGroup, version, type, name, namespace)
 * - Groups errors by: resource type + API group + status code
 * - Creates descriptive error title (e.g., "API 404: GET dnszones")
 *
 * @example
 * captureApiError({
 *   error: axiosError,
 *   method: 'GET',
 *   url: '/apis/dns.networking.miloapis.com/v1alpha1/dnszones/my-zone',
 *   status: 404,
 *   message: 'Not Found',
 * });
 */
export function captureApiError(options: CaptureApiErrorOptions): void {
  const { error, url, method = 'REQUEST', status = 'unknown', message, requestId, tags, extra } =
    options;

  // Parse resource info from URL for context and fingerprinting
  const resourceInfo = url ? parseResourceFromUrl(url) : null;

  // Set resource context from URL
  if (url) {
    setResourceContextFromUrl(url);
  }

  const httpMethod = method.toUpperCase();
  const statusStr = String(status);

  // Build fingerprint for better error grouping
  // Groups errors by: resource type + API group + status code
  const fingerprint = resourceInfo
    ? ['api-error', resourceInfo.resourceType, resourceInfo.apiGroup, statusStr]
    : ['api-error', url ?? 'unknown', statusStr];

  // Build descriptive title for Sentry
  // e.g., "API 404: GET dnszones" or "API 500: POST projects"
  const errorTitle = resourceInfo
    ? `API ${statusStr}: ${httpMethod} ${resourceInfo.resourceType}`
    : `API ${statusStr}: ${httpMethod} ${url ?? 'unknown'}`;

  // Determine error message
  const errorMessage = message || error.message || 'Unknown error';

  // Capture with custom error name for better Sentry title
  Sentry.withScope((scope) => {
    scope.setFingerprint(fingerprint);
    scope.setTag('type', 'api_error');
    scope.setTag('status', statusStr);
    scope.setTag('method', httpMethod);

    // Add custom tags
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    // Add extra context
    scope.setExtra('url', url);
    scope.setExtra('method', httpMethod);
    scope.setExtra('status', status);
    if (requestId) {
      scope.setExtra('requestId', requestId);
    }
    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    // Create a new error with descriptive name and message
    const apiError = new Error(errorMessage);
    apiError.name = errorTitle;
    apiError.cause = error;
    apiError.stack = error.stack;

    Sentry.captureException(apiError);
  });
}
