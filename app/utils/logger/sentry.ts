import { IUser } from '@/resources/interfaces/user.interface';
import { getBrowserTimezone } from '@/utils/helpers/timezone';
import * as Sentry from '@sentry/react';

/**
 * Set user context in Sentry for error tracking
 * This function should be called when a user logs in
 */
export function setSentryUser(user: IUser): void {
  // Set user context in Sentry for error tracking
  Sentry.setUser({
    id: user.uid,
    email: user.email,
    username: user.sub,
  });

  // Add user context as tags for better filtering in Sentry
  Sentry.setTag('user.id', user.uid);
  Sentry.setTag('user.email', user.email);
  Sentry.setTag('user.name', `${user.givenName} ${user.familyName}`);
  Sentry.setTag('user.creation_date', user.createdAt?.toString() || 'unknown');
  Sentry.setTag('user.theme', user.preferences?.theme || 'light');
  Sentry.setTag('user.timezone', user.preferences?.timezone || getBrowserTimezone());

  // Add user context as extra data for more detailed debugging
  Sentry.setContext('user', {
    uid: user.uid,
    email: user.email,
    fullName: `${user.givenName} ${user.familyName}`,
    username: user.sub,
    creationDate: user.createdAt?.toString() || 'unknown',
    theme: user.preferences?.theme,
    timezone: user.preferences?.timezone,
    resourceVersion: user.resourceVersion,
  });
}

/**
 * Clear user context in Sentry
 * This function should be called when a user logs out
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
 * Add custom breadcrumb to Sentry for better debugging context
 */
export function addSentryBreadcrumb(
  message: string,
  category: string = 'user',
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Set custom tag in Sentry for filtering and organization
 */
export function setSentryTag(key: string, value: string | number | boolean | undefined): void {
  Sentry.setTag(key, value);
}

/**
 * Set custom context in Sentry for additional debugging information
 */
export function setSentryContext(name: string, context: Record<string, any> | null): void {
  Sentry.setContext(name, context);
}
