import {
  evaluateOrgSetupComplete,
  hasActivePaymentMethodForAccount,
  isOrgContactSetupComplete,
  isOrgSetupCompleteFromLoadResult,
} from './org-setup-status';
import { describe, expect, it } from 'bun:test';

describe('isOrgContactSetupComplete', () => {
  it('requires email and name on the org', () => {
    expect(isOrgContactSetupComplete({ contactInfo: undefined })).toBe(false);
    expect(
      isOrgContactSetupComplete({ contactInfo: { email: 'a@b.com', name: '' } } as never)
    ).toBe(false);
    expect(
      isOrgContactSetupComplete({ contactInfo: { email: 'a@b.com', name: 'Jane' } } as never)
    ).toBe(true);
  });
});

describe('hasActivePaymentMethodForAccount', () => {
  it('matches active methods on the billing account', () => {
    const methods = [
      {
        spec: { billingAccountRef: { name: 'acct-1' } },
        status: { phase: 'Active' },
      },
    ] as never;

    expect(hasActivePaymentMethodForAccount(methods, 'acct-1')).toBe(true);
    expect(hasActivePaymentMethodForAccount(methods, 'acct-2')).toBe(false);
  });
});

describe('evaluateOrgSetupComplete', () => {
  const completeOrg = { contactInfo: { email: 'a@b.com', name: 'Jane' } } as never;
  const accounts = [{ metadata: { name: 'acct-1' }, status: { phase: 'Ready' } }] as never;
  const payments = [
    {
      spec: { billingAccountRef: { name: 'acct-1' } },
      status: { phase: 'Active' },
    },
  ] as never;

  it('passes when contact, billing account, and payment are present', () => {
    expect(
      evaluateOrgSetupComplete({
        org: completeOrg,
        billingAccounts: accounts,
        paymentMethods: payments,
      })
    ).toBe(true);
  });

  it('fails when contact info is missing', () => {
    expect(
      evaluateOrgSetupComplete({
        org: { contactInfo: undefined },
        billingAccounts: accounts,
        paymentMethods: payments,
      })
    ).toBe(false);
  });

  it('fails when there is no billing account', () => {
    expect(
      evaluateOrgSetupComplete({
        org: completeOrg,
        billingAccounts: [],
        paymentMethods: payments,
      })
    ).toBe(false);
  });

  it('fails when the default account has no active payment method', () => {
    expect(
      evaluateOrgSetupComplete({
        org: completeOrg,
        billingAccounts: accounts,
        paymentMethods: [],
      })
    ).toBe(false);
  });

  it('prefers a Ready billing account when choosing the default', () => {
    const mixedAccounts = [
      { metadata: { name: 'pending' }, status: { phase: 'Provisioning' } },
      { metadata: { name: 'ready' }, status: { phase: 'Ready' } },
    ] as never;

    expect(
      evaluateOrgSetupComplete({
        org: completeOrg,
        billingAccounts: mixedAccounts,
        paymentMethods: [
          {
            spec: { billingAccountRef: { name: 'ready' } },
            status: { phase: 'Active' },
          },
        ] as never,
      })
    ).toBe(true);
  });
});

describe('isOrgSetupCompleteFromLoadResult', () => {
  it('treats missing contact as incomplete even when billing listing is indeterminate', () => {
    // Ryan-shaped: org.get succeeds with empty contact, billing/payment list 403s.
    // Previously fail-open treated the whole check as complete and skipped the
    // /onboarding/billing redirect when clicking the org from the list.
    expect(
      isOrgSetupCompleteFromLoadResult({
        status: 'billing-indeterminate',
        org: { contactInfo: undefined },
      })
    ).toBe(false);
  });

  it('fails open when contact is complete but billing listing is indeterminate', () => {
    expect(
      isOrgSetupCompleteFromLoadResult({
        status: 'billing-indeterminate',
        org: { contactInfo: { email: 'a@b.com', name: 'Jane' } } as never,
      })
    ).toBe(true);
  });

  it('delegates ready inputs to evaluateOrgSetupComplete', () => {
    expect(
      isOrgSetupCompleteFromLoadResult({
        status: 'ready',
        input: {
          org: { contactInfo: undefined },
          billingAccounts: [],
          paymentMethods: [],
        },
      })
    ).toBe(false);
  });
});
