// app/modules/logger/integrations/sentry.ts
import type { LogLevel, LogContext } from '../logger.types';
import * as Sentry from '@sentry/react-router';

const LEVEL_TO_SENTRY: Record<LogLevel, Sentry.SeverityLevel> = {
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
};

export function addBreadcrumb(
  level: LogLevel,
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  // Skip debug logs - too verbose for Sentry
  if (level === 'debug') return;

  Sentry.addBreadcrumb({
    category,
    message,
    level: LEVEL_TO_SENTRY[level],
    data,
  });
}

export function setLoggerContext(context: LogContext): void {
  if (context.requestId) {
    Sentry.setTag('requestId', context.requestId);
  }
  if (context.organizationId) {
    Sentry.setTag('organizationId', context.organizationId);
  }
  if (context.userId) {
    Sentry.setUser({ id: context.userId });
  }
  if (context.path || context.method) {
    Sentry.setContext('request', {
      path: context.path,
      method: context.method,
      userAgent: context.userAgent,
    });
  }
}

export function captureError(message: string, error: Error, context?: LogContext): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context as Record<string, unknown>);
    }
    scope.setLevel('error');
    Sentry.captureException(error, {
      extra: { message },
    });
  });
}

// ============================================================================
// User-related Sentry utilities (for auth/session tracking)
// ============================================================================

interface SentryUser {
  uid?: string;
  email?: string;
  sub?: string;
  givenName?: string;
  familyName?: string;
  createdAt?: Date | string;
  preferences?: {
    theme?: string;
    timezone?: string;
  };
  resourceVersion?: string;
}

/**
 * Set user context in Sentry for error tracking
 * Call this when a user logs in
 */
export function setSentryUser(user: SentryUser, timezone?: string): void {
  Sentry.setUser({
    id: user.uid,
    email: user.email,
    username: user.sub,
  });

  Sentry.setTag('user.id', user.uid);
  if (user.email) Sentry.setTag('user.email', user.email);
  if (user.givenName && user.familyName) {
    Sentry.setTag('user.name', `${user.givenName} ${user.familyName}`);
  }
  Sentry.setTag('user.creation_date', user.createdAt?.toString() || 'unknown');
  Sentry.setTag('user.theme', user.preferences?.theme || 'light');
  Sentry.setTag('user.timezone', user.preferences?.timezone || timezone || 'unknown');

  Sentry.setContext('user', {
    uid: user.uid,
    email: user.email,
    fullName:
      user.givenName && user.familyName ? `${user.givenName} ${user.familyName}` : undefined,
    username: user.sub,
    creationDate: user.createdAt?.toString() || 'unknown',
    theme: user.preferences?.theme,
    timezone: user.preferences?.timezone,
    resourceVersion: user.resourceVersion,
  });
}

/**
 * Clear user context in Sentry
 * Call this when a user logs out
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
  Sentry.setTag('user.id', undefined);
  Sentry.setTag('user.email', undefined);
  Sentry.setTag('user.name', undefined);
  Sentry.setTag('user.creation_date', undefined);
  Sentry.setTag('user.theme', undefined);
  Sentry.setTag('user.timezone', undefined);
  Sentry.setContext('user', null);
}

/**
 * Set custom tag in Sentry
 */
export function setSentryTag(key: string, value: string | number | boolean | undefined): void {
  Sentry.setTag(key, value);
}

/**
 * Set custom context in Sentry
 */
export function setSentryContext(name: string, context: Record<string, unknown> | null): void {
  Sentry.setContext(name, context);
}
