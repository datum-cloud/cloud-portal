import {
  isAwaitingEmailVerification,
  onboardingEntryPath,
  resolveFraudPollResult,
  resolveUserFraudRedirectPath,
  resolveVerifyEmailPageRedirect,
} from './fraud-redirect';
import { PlatformAccess } from '@/resources/users/user.schema';
import { paths } from '@/utils/config/paths.config';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

const baseUser = {
  state: 'Active' as const,
  platformAccess: PlatformAccess.Approved,
  nameReviewRequired: false,
};

// The gate reads process.env at call time (see utils/config/email-verification-gate.ts),
// so flipping it here is enough — no module reset needed. Cleared before AND
// after every test so the pre-existing describes above keep running with the
// gate off, which is the default they were written against.
const enableGate = () => {
  process.env.EMAIL_VERIFICATION_GATE = 'true';
};

beforeEach(() => {
  delete process.env.EMAIL_VERIFICATION_GATE;
});

afterEach(() => {
  delete process.env.EMAIL_VERIFICATION_GATE;
});

describe('resolveUserFraudRedirectPath', () => {
  it('redirects inactive users to account suspended', () => {
    expect(
      resolveUserFraudRedirectPath(
        { ...baseUser, state: 'Inactive' } as never,
        paths.account.organizations.root
      )
    ).toBe(paths.fraud.accountSuspended);
  });

  it('redirects pending registration to verifying', () => {
    expect(
      resolveUserFraudRedirectPath(
        { ...baseUser, platformAccess: PlatformAccess.Pending } as never,
        paths.account.organizations.root
      )
    ).toBe(paths.fraud.verifying);
  });

  it('redirects rejected registration to under review', () => {
    expect(
      resolveUserFraudRedirectPath(
        { ...baseUser, platformAccess: PlatformAccess.Rejected } as never,
        paths.account.organizations.root
      )
    ).toBe(paths.fraud.accountUnderReview);
  });

  it('allows approved users with no name review requirement', () => {
    expect(
      resolveUserFraudRedirectPath(baseUser as never, paths.account.organizations.root)
    ).toBeNull();
  });

  it('redirects approved users with name review required to profile onboarding', () => {
    expect(
      resolveUserFraudRedirectPath(
        { ...baseUser, nameReviewRequired: true } as never,
        paths.account.organizations.root
      )
    ).toBe(paths.onboarding.profile);
  });
});

describe('resolveFraudPollResult', () => {
  it('returns pending while registration is still under review', () => {
    expect(
      resolveFraudPollResult({
        ...baseUser,
        platformAccess: PlatformAccess.Pending,
      } as never)
    ).toEqual({ status: 'pending', reason: 'fraud-review' });
  });

  it('returns onboarding redirect when registration is approved', () => {
    expect(resolveFraudPollResult(baseUser as never)).toEqual({
      status: 'completed',
      decision: 'ACCEPTED',
      redirectTo: paths.onboarding.account,
    });
  });

  it('returns profile onboarding when name review is required', () => {
    expect(resolveFraudPollResult({ ...baseUser, nameReviewRequired: true } as never)).toEqual({
      status: 'completed',
      decision: 'ACCEPTED',
      redirectTo: paths.onboarding.profile,
    });
  });
});

describe('onboardingEntryPath', () => {
  it('matches resolveFraudPollResult redirect target', () => {
    const user = { ...baseUser, nameReviewRequired: true } as never;
    const poll = resolveFraudPollResult(user);
    expect(poll.status === 'completed' ? poll.redirectTo : null).toBe(onboardingEntryPath(user));
  });
});

describe('resolveUserFraudRedirectPath — email verification gate', () => {
  // Approved + name review cleared: the strongest possible "should be let in"
  // user, so anything that stops them is the gate and nothing else.
  const unverified = { ...baseUser, emailVerified: false };
  const here = paths.account.organizations.root;

  it('is completely inert while the flag is off — the shipping default', () => {
    expect(resolveUserFraudRedirectPath(unverified as never, here)).toBeNull();
  });

  it('redirects an unverified user to verify-email once the flag is on', () => {
    enableGate();
    expect(resolveUserFraudRedirectPath(unverified as never, here)).toBe(paths.fraud.verifyEmail);
  });

  it('reads an ABSENT emailVerified as unverified (fail-closed)', () => {
    enableGate();
    expect(resolveUserFraudRedirectPath(baseUser as never, here)).toBe(paths.fraud.verifyEmail);
  });

  it('never shows a verify prompt to a suspended or inactive user', () => {
    enableGate();
    expect(resolveUserFraudRedirectPath({ ...unverified, state: 'Inactive' } as never, here)).toBe(
      paths.fraud.accountSuspended
    );
    expect(
      resolveUserFraudRedirectPath(
        { ...unverified, platformAccess: PlatformAccess.Suspended } as never,
        here
      )
    ).toBe(paths.fraud.accountSuspended);
  });

  it('gates BEFORE approval, rejection, and the pending wait', () => {
    enableGate();
    for (const platformAccess of [
      PlatformAccess.Approved,
      PlatformAccess.Rejected,
      PlatformAccess.Pending,
    ]) {
      expect(resolveUserFraudRedirectPath({ ...unverified, platformAccess } as never, here)).toBe(
        paths.fraud.verifyEmail
      );
    }
  });

  it('gates before the name-review nudge', () => {
    enableGate();
    expect(
      resolveUserFraudRedirectPath({ ...unverified, nameReviewRequired: true } as never, here)
    ).toBe(paths.fraud.verifyEmail);
  });

  it('lets a verified user through unchanged', () => {
    enableGate();
    expect(
      resolveUserFraudRedirectPath({ ...baseUser, emailVerified: true } as never, here)
    ).toBeNull();
  });

  it('does not redirect the verify-email page to itself', () => {
    enableGate();
    expect(resolveUserFraudRedirectPath(unverified as never, paths.fraud.verifyEmail)).toBeNull();
  });
});

describe('resolveFraudPollResult — email verification gate', () => {
  const unverified = { ...baseUser, emailVerified: false };

  it('is completely inert while the flag is off', () => {
    expect(resolveFraudPollResult(unverified as never)).toEqual({
      status: 'completed',
      decision: 'ACCEPTED',
      redirectTo: paths.onboarding.account,
    });
  });

  it('holds an unverified user with a distinguishable pending reason', () => {
    enableGate();
    expect(resolveFraudPollResult(unverified as never)).toEqual({
      status: 'pending',
      reason: 'email-unverified',
    });
  });

  it('still deactivates a suspended user ahead of the verify wait', () => {
    enableGate();
    expect(resolveFraudPollResult({ ...unverified, state: 'Inactive' } as never)).toEqual({
      status: 'completed',
      decision: 'DEACTIVATE',
    });
  });

  it('releases the user the moment verification lands', () => {
    enableGate();
    expect(resolveFraudPollResult({ ...baseUser, emailVerified: true } as never)).toEqual({
      status: 'completed',
      decision: 'ACCEPTED',
      redirectTo: paths.onboarding.account,
    });
  });

  it('reports a verified-but-Pending user as a FRAUD wait, not an email wait', () => {
    // This is the assertion that stops /verify-email becoming a dead end: once
    // the address is proven the page must be able to tell that it is now
    // waiting on staff, and move the user to /verifying.
    enableGate();
    expect(
      resolveFraudPollResult({
        ...baseUser,
        emailVerified: true,
        platformAccess: PlatformAccess.Pending,
      } as never)
    ).toEqual({ status: 'pending', reason: 'fraud-review' });
  });
});

describe('isAwaitingEmailVerification', () => {
  it('is true only for the email wait', () => {
    expect(isAwaitingEmailVerification({ status: 'pending', reason: 'email-unverified' })).toBe(
      true
    );
    expect(isAwaitingEmailVerification({ status: 'pending', reason: 'fraud-review' })).toBe(false);
    expect(isAwaitingEmailVerification({ status: 'completed', decision: 'ACCEPTED' })).toBe(false);
    expect(isAwaitingEmailVerification({ status: 'completed', decision: 'DEACTIVATE' })).toBe(
      false
    );
  });
});

describe('resolveVerifyEmailPageRedirect', () => {
  it('sends everyone home while the flag is off — the disable direction of the kill switch', () => {
    expect(resolveVerifyEmailPageRedirect({ emailVerified: false })).toBe(paths.home);
    expect(resolveVerifyEmailPageRedirect(null)).toBe(paths.home);
  });

  it('renders the page for an unverified user when the flag is on', () => {
    enableGate();
    expect(resolveVerifyEmailPageRedirect({ emailVerified: false })).toBeNull();
  });

  it('renders the page when emailVerified is absent (fail-closed)', () => {
    enableGate();
    expect(resolveVerifyEmailPageRedirect({})).toBeNull();
  });

  it('sends a verified user home so the page is never a dead end', () => {
    enableGate();
    expect(resolveVerifyEmailPageRedirect({ emailVerified: true })).toBe(paths.home);
  });

  it('renders the page when the user could not be read at all', () => {
    // Fail-CLOSED by staying put: this page IS the block, so an upstream
    // failure must not become a way past it.
    enableGate();
    expect(resolveVerifyEmailPageRedirect(null)).toBeNull();
  });
});
