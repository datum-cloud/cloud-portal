// app/modules/logger/sentry.client.ts
// Client-safe Sentry utilities for user tracking
// These don't depend on server-only logger config
import * as Sentry from '@sentry/react-router';

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

  if (user.uid) Sentry.setTag('user.id', user.uid);
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
