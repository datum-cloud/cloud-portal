import { isOnboardingDevBypassEnabled } from '@/features/onboarding/onboarding-dev-bypass';
import type { User } from '@/resources/users';
import { PlatformAccess } from '@/resources/users/user.schema';
import { isEmailVerificationGateEnabled } from '@/utils/config/email-verification-gate';
import { paths } from '@/utils/config/paths.config';
import { redirect } from 'react-router';

export type FraudPollResult =
  | {
      status: 'pending';
      /**
       * WHICH wait this is. Required, not optional: /verify-email polls this
       * endpoint to decide whether to stay put, and an optional field would
       * let a future pending branch omit it — at which point the page reads
       * `undefined`, concludes "not an email wait", and navigates a still-
       * unverified user away from the page that exists to hold them.
       */
      reason: 'fraud-review' | 'email-unverified';
    }
  | {
      status: 'completed';
      decision: 'ACCEPTED' | 'REVIEW' | 'DEACTIVATE';
      redirectTo?: string;
    };

/** First onboarding step for users who have not joined an org yet. */
export const onboardingEntryPath = (user: User): string =>
  user.nameReviewRequired ? paths.onboarding.profile : paths.onboarding.account;

/**
 * Whether the email-verification gate should hold this user.
 *
 * Reads ABSENT as unverified: `emailVerified` is optional on the domain User
 * and no User record predating the gate carries it, so `!== true` is the
 * fail-closed reading. `toUser` already coerces the wire value to a boolean,
 * but this does not lean on that — a User built by hand (buildDevStubUser,
 * test fixtures) must not slip the gate by omitting the key.
 *
 * Returns false whenever the flag is off, which is what lets every branch
 * below ship dark.
 */
function isBlockedOnEmailVerification(user: User): boolean {
  return isEmailVerificationGateEnabled() && user.emailVerified !== true;
}

/**
 * The redirect to issue when a caller could not DETERMINE the user's state, or
 * undefined to let the request proceed.
 *
 * Admitting on "we don't know" is a fail-open, and it fails open on exactly the
 * population this gate exists to catch. Shared by the two middlewares so the
 * indeterminate case is answered the same way in both.
 *
 * Keyed on the flag deliberately: with the gate off this returns undefined and
 * every caller behaves exactly as it did before. Denying unconditionally would
 * turn a transient upstream failure into a portal-wide outage before the gate
 * is even on.
 *
 * /verifying is safe as the destination — it sits outside the private layout
 * (blocking-page invariant, routes.ts) so it cannot loop, and it self-heals:
 * the page polls and releases the user once the upstream answers again.
 */
export function denyIfEmailGateEnabled(): Response | undefined {
  return isEmailVerificationGateEnabled() ? redirect(paths.fraud.verifying) : undefined;
}

/**
 * True while /verify-email must keep waiting. Anything else — a completed
 * decision, or a pending FRAUD review — means the address is proven and the
 * cascade has moved on, so the page hands control back to the server.
 */
export function isAwaitingEmailVerification(result: FraudPollResult): boolean {
  return result.status === 'pending' && result.reason === 'email-unverified';
}

/**
 * Where /verify-email should send the user instead of rendering, or null to
 * render the blocking page.
 *
 * Pass `null` for `user` when the user could not be read — that renders the
 * page. Fail-CLOSED: this page is the block, so an upstream outage must not
 * become a way past it.
 *
 * The flag-off branch is the disable direction of the kill switch: the instant
 * EMAIL_VERIFICATION_GATE is rolled back off, anyone parked here is released on
 * their next navigation rather than stranded on a page nothing moves them past.
 */
export function resolveVerifyEmailPageRedirect(
  user: Pick<User, 'emailVerified'> | null
): string | null {
  if (!isEmailVerificationGateEnabled()) {
    return paths.home;
  }
  if (user?.emailVerified === true) {
    return paths.home;
  }
  return null;
}

export function resolveFraudPollResult(user: User): FraudPollResult {
  if (user.platformAccess === PlatformAccess.Suspended || user.state === 'Inactive') {
    return { status: 'completed', decision: 'DEACTIVATE' };
  }

  // Position 2, the same rank this branch holds in resolveUserFraudRedirectPath
  // below — and it has to be. If this returned ACCEPTED for an approved but
  // unverified user, /verify-email would poll, be told to proceed, navigate,
  // and be bounced straight back by the cascade. That is a loop, not a funnel.
  // The two functions move together or not at all.
  if (isBlockedOnEmailVerification(user)) {
    return { status: 'pending', reason: 'email-unverified' };
  }

  if (user.platformAccess === PlatformAccess.Approved) {
    return {
      status: 'completed',
      decision: 'ACCEPTED',
      redirectTo: onboardingEntryPath(user),
    };
  }

  if (user.platformAccess === PlatformAccess.Rejected) {
    return { status: 'completed', decision: 'REVIEW' };
  }

  return { status: 'pending', reason: 'fraud-review' };
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

  if (user.platformAccess === PlatformAccess.Suspended || user.state === 'Inactive') {
    return paths.fraud.accountSuspended;
  }

  // Position 2 — after suspension, before approval. After suspension because a
  // suspended user must never see a verify prompt; before approval because
  // staff should not review an address nobody has proven they own. This is an
  // ADDITIONAL gate, not a replacement for staff approval: the funnel is
  // check-your-email → verify → under review → staff approves → in.
  //
  // The self-exclusion mirrors the name-review branch below and relies on the
  // blocking-page invariant (routes.ts) rather than trusting it — see
  // routes-layout-invariant.test.ts.
  if (isBlockedOnEmailVerification(user) && pathname !== paths.fraud.verifyEmail) {
    return paths.fraud.verifyEmail;
  }

  if (user.platformAccess === PlatformAccess.Approved) {
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

  if (user.platformAccess === PlatformAccess.Rejected) {
    return paths.fraud.accountUnderReview;
  }

  return paths.fraud.verifying;
}
