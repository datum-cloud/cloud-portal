import {
  evaluateOrgSetupComplete,
  hasActivePaymentMethodForAccount,
  isOrgContactSetupComplete,
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
