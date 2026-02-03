/**
 * Sentry User Context
 *
 * Sets user identity in Sentry for error tracking.
 * Call setSentryUser on login, clearSentryUser on logout.
 */
import * as Sentry from '@sentry/react-router';

export interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  name?: string;
}

/**
 * Set user context in Sentry.
 * - Sets Sentry user object (for user identification)
 * - Sets user.id tag (for filtering)
 * - Sets user context (for detailed view)
 */
export function setSentryUser(user: SentryUser): void {
  // Sentry user object - appears in issue assignee, user search
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  // Tag for filtering issues/replays by user
  Sentry.setTag('user.id', user.id);
  Sentry.setTag('user.username', user.username);
  Sentry.setTag('user.email', user.email);

  // Context for detailed sidebar view
  Sentry.setContext('user', {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
  });
}

/**
 * Clear user context from Sentry.
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
  Sentry.setTag('user.id', undefined);
  Sentry.setContext('user', null);
}
