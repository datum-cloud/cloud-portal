/**
 * Sentry API Breadcrumbs
 *
 * Tracks API calls as Sentry breadcrumbs for debugging.
 */
import * as Sentry from '@sentry/react-router';

export interface ApiCallOptions {
  method: string;
  url: string;
  status: number;
  duration?: number;
}

/**
 * Track API call as breadcrumb.
 */
export function trackApiCall(options: ApiCallOptions): void {
  const level = options.status >= 400 ? 'error' : 'info';

  Sentry.addBreadcrumb({
    category: 'api',
    message: `${options.method} ${options.url}`,
    level,
    data: {
      method: options.method,
      url: options.url,
      status: options.status,
      duration: options.duration,
    },
  });
}

/**
 * Track API error as breadcrumb.
 */
export function trackApiError(options: ApiCallOptions & { error: string | Error }): void {
  Sentry.addBreadcrumb({
    category: 'api',
    message: `${options.method} ${options.url} failed`,
    level: 'error',
    data: {
      method: options.method,
      url: options.url,
      status: options.status,
      duration: options.duration,
      error: typeof options.error === 'string' ? options.error : options.error.message,
    },
  });
}
