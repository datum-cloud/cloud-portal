/**
 * Sentry Error Capture
 *
 * Utilities for capturing errors and adding breadcrumbs to Sentry.
 */
import * as Sentry from '@sentry/react-router';

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
