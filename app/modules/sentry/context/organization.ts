/**
 * Sentry Organization Context
 *
 * Sets organization context in Sentry for multi-tenant filtering.
 * Call setSentryOrgContext from org layout when organization is loaded.
 */
import * as Sentry from '@sentry/react-router';

export interface OrganizationContext {
  name: string;
  uid?: string;
}

/**
 * Set organization context in Sentry.
 */
export function setSentryOrgContext(org: OrganizationContext): void {
  Sentry.setTag('org.id', org.name);
  Sentry.setContext('organization', {
    id: org.name,
    uid: org.uid,
  });
}

/**
 * Clear organization context from Sentry.
 */
export function clearSentryOrgContext(): void {
  Sentry.setTag('org.id', undefined);
  Sentry.setContext('organization', null);
}
