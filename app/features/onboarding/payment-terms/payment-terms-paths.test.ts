import {
  cardSetupPath,
  isNewOrgEntry,
  paymentTermsPath,
  readPaymentTermsSearch,
} from './payment-terms-paths';
import { describe, expect, it } from 'bun:test';

describe('payment terms paths', () => {
  it('round-trips the search params', () => {
    const path = paymentTermsPath({
      orgId: 'acme',
      billingAccountName: 'acme-billing',
      entry: 'settings',
      apply: true,
    });
    expect(path).toBe(
      '/onboarding/payment-terms?orgId=acme&account=acme-billing&from=settings&apply=1'
    );
    expect(readPaymentTermsSearch(new URL(`http://localhost${path}`))).toEqual({
      orgId: 'acme',
      billingAccountName: 'acme-billing',
      entry: 'settings',
      apply: true,
    });
  });

  it('defaults to finishing setup', () => {
    expect(paymentTermsPath({ orgId: 'acme' })).toBe('/onboarding/payment-terms?orgId=acme');
    expect(
      readPaymentTermsSearch(new URL('http://localhost/onboarding/payment-terms?from=bogus')).entry
    ).toBe('setup');
  });

  it('sends "Add a card" back to the right place', () => {
    expect(cardSetupPath({ orgId: 'acme', entry: 'onboarding' })).toBe(
      '/onboarding/billing?method=card'
    );
    expect(cardSetupPath({ orgId: 'acme', entry: 'setup' })).toBe(
      '/onboarding/billing?method=card&orgId=acme'
    );
    expect(
      cardSetupPath({ orgId: 'acme', entry: 'settings', billingAccountName: 'acme-billing' })
    ).toBe('/account/billing/acme-billing');
  });

  it('treats a new org from the organizations page like onboarding, but keeps its id', () => {
    expect(paymentTermsPath({ orgId: 'acme', entry: 'create' })).toBe(
      '/onboarding/payment-terms?orgId=acme&from=create'
    );
    expect(
      readPaymentTermsSearch(new URL('http://localhost/onboarding/payment-terms?from=create')).entry
    ).toBe('create');
    // Existing users can't use the onboarding billing step without an org id.
    expect(cardSetupPath({ orgId: 'acme', entry: 'create' })).toBe(
      '/onboarding/billing?method=card&orgId=acme'
    );
    expect(isNewOrgEntry('create')).toBe(true);
    expect(isNewOrgEntry('onboarding')).toBe(true);
    expect(isNewOrgEntry('setup')).toBe(false);
    expect(isNewOrgEntry('settings')).toBe(false);
  });
});
