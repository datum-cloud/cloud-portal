import type { Event } from '@sentry/react-router';

/**
 * System actors that generate noise — not real user errors.
 * Add new entries here as new backend system users are identified.
 *
 * - 'system:anonymous': Backend cron job health-check user
 */
const SYSTEM_NOISE_ACTORS = ['system:anonymous'] as const;

function containsNoise(text: string | undefined): boolean {
  if (!text) return false;
  return SYSTEM_NOISE_ACTORS.some((actor) => text.includes(actor));
}

/**
 * Returns true if the event is noise and should be dropped from Sentry.
 * Checks exception values and standalone message strings.
 */
export function isNoiseEvent(event: Event): boolean {
  const hasNoisyException = event.exception?.values?.some(
    (ex) => containsNoise(ex.value) || containsNoise(ex.type)
  );
  if (hasNoisyException) return true;

  if (containsNoise(event.message)) return true;

  return false;
}
