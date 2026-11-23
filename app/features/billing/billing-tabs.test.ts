import { billingTabs } from './billing-tabs';
import { describe, expect, it } from 'vitest';

describe('billingTabs', () => {
  it('lists the four tabs, the overview at the billing root', () => {
    expect(billingTabs('acme')).toEqual([
      { label: 'Overview', href: '/org/acme/billing' },
      { label: 'Subscriptions & Pricing', href: '/org/acme/billing/subscriptions' },
      { label: 'Invoices', href: '/org/acme/billing/invoices' },
      { label: 'Payment Methods', href: '/org/acme/billing/payment-methods' },
    ]);
  });

  it('carries a selected account across the tabs', () => {
    expect(billingTabs('acme', 'old account').map((tab) => tab.href)).toEqual([
      '/org/acme/billing?account=old%20account',
      '/org/acme/billing/subscriptions?account=old%20account',
      '/org/acme/billing/invoices?account=old%20account',
      '/org/acme/billing/payment-methods?account=old%20account',
    ]);
  });
});
