import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import type { User } from '@/resources/users';
import { RegistrationApproval } from '@/resources/users/user.schema';
import { paths } from '@/utils/config/paths.config';

export type FraudPollResult =
  | { status: 'pending' }
  | {
      status: 'completed';
      decision: 'ACCEPTED' | 'REVIEW' | 'DEACTIVATE';
      redirectTo?: string;
    };

/** First onboarding step for users who have not joined an org yet. */
export const onboardingEntryPath = (user: User): string =>
  user.nameReviewRequired ? paths.onboarding.profile : paths.onboarding.account;

export function resolveFraudPollResult(user: User): FraudPollResult {
  if (user.state === 'Inactive') {
    return { status: 'completed', decision: 'DEACTIVATE' };
  }

  if (user.registrationApproval === RegistrationApproval.Approved) {
    return {
      status: 'completed',
      decision: 'ACCEPTED',
      redirectTo: onboardingEntryPath(user),
    };
  }

  if (user.registrationApproval === RegistrationApproval.Rejected) {
    return { status: 'completed', decision: 'REVIEW' };
  }

  return { status: 'pending' };
}

/**
 * Returns a fraud/compliance redirect path for the user, or null when access
 * may proceed. Shared by fraudStatusMiddleware and authMiddleware's no-orgs gate.
 */
export function resolveUserFraudRedirectPath(
  user: User,
  pathname: string,
  options?: { enforceNameReview?: boolean }
): string | null {
  const enforceNameReview = options?.enforceNameReview ?? true;

  if (user.state === 'Inactive') {
    return paths.fraud.accountSuspended;
  }

  if (user.registrationApproval === RegistrationApproval.Approved) {
    if (
      enforceNameReview &&
      user.nameReviewRequired &&
      pathname !== paths.onboarding.profile &&
      !isOnboardingDevBypassEnabled()
    ) {
      return paths.onboarding.profile;
    }
    return null;
  }

  if (user.registrationApproval === RegistrationApproval.Rejected) {
    return paths.fraud.accountUnderReview;
  }

  return paths.fraud.verifying;
}
