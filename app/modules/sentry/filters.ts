import type { Event } from '@sentry/react-router';

/**
 * Known system-level actors whose events are suppressed in Sentry.
 * These are internal backend users, not real end users. Their events
 * fire frequently and make it harder to see actual user errors.
 * Add new entries here as additional system actors are identified.
 *
 * - 'system:anonymous': Backend cron job health-check user
 */
const KNOWN_SYSTEM_ACTORS = ['system:anonymous'] as const;

function isFromSystemActor(text: string | undefined): boolean {
  if (!text) return false;
  return KNOWN_SYSTEM_ACTORS.some((actor) => text.includes(actor));
}

/**
 * Returns true if the event originates from a known system actor
 * and should be suppressed in Sentry.
 * Checks exception values and standalone message strings.
 */
export function isKnownSystemEvent(event: Event): boolean {
  const hasSystemException = event.exception?.values?.some(
    (ex) => isFromSystemActor(ex.value) || isFromSystemActor(ex.type)
  );
  if (hasSystemException) return true;

  if (isFromSystemActor(event.message)) return true;

  return false;
}
