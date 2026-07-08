import {
  onboardingEntryPath,
  resolveFraudPollResult,
  resolveUserFraudRedirectPath,
} from './fraud-redirect';
import { RegistrationApproval } from '@/resources/users/user.schema';
import { paths } from '@/utils/config/paths.config';
import { describe, expect, it } from 'bun:test';

const baseUser = {
  state: 'Active' as const,
  registrationApproval: RegistrationApproval.Approved,
  nameReviewRequired: false,
};

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
        { ...baseUser, registrationApproval: RegistrationApproval.Pending } as never,
        paths.account.organizations.root
      )
    ).toBe(paths.fraud.verifying);
  });

  it('redirects rejected registration to under review', () => {
    expect(
      resolveUserFraudRedirectPath(
        { ...baseUser, registrationApproval: RegistrationApproval.Rejected } as never,
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
        registrationApproval: RegistrationApproval.Pending,
      } as never)
    ).toEqual({ status: 'pending' });
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
