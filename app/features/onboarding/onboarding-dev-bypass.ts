import { env } from '@/utils/env';

/**
 * Temporary local-dev escape hatch. Set ONBOARDING_DEV_BYPASS=true in .env to
 * preview onboarding routes with an account that already has orgs / cleared name
 * review, including /onboarding/provisioning without billing location state.
 */
export function isOnboardingDevBypassEnabled(): boolean {
  return env.isDev && process.env.ONBOARDING_DEV_BYPASS === 'true';
}
