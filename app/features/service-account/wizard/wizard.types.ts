import type { UseCase } from '@/resources/service-accounts';

/**
 * UI defaults derived from the use-case the user picked on the picker page.
 * Drives:
 *  - default key expiry length on the wizard's key step
 *  - the tab `KeyRevealPanel` opens on after navigating to /keys
 *
 * Intent values follow the field's existing description copy:
 *  "Recommended: 90 days for CI/CD, 1 year for long-lived services."
 */
export const USE_CASE_DEFAULTS: Record<
  UseCase,
  { expiryDays: number; revealTab: 'github' | 'kubernetes' }
> = {
  cicd: { expiryDays: 90, revealTab: 'github' },
  service: { expiryDays: 365, revealTab: 'kubernetes' },
};
