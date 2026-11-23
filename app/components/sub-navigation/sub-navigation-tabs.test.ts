import { activeTabHref } from './sub-navigation-tabs';
import { describe, expect, it } from 'vitest';

const tabs = [
  { label: 'Overview', href: '/org/acme/billing' },
  { label: 'Invoices', href: '/org/acme/billing/invoices' },
];

describe('activeTabHref', () => {
  it('picks the longest tab path the pathname starts with', () => {
    expect(activeTabHref('/org/acme/billing', tabs)).toBe('/org/acme/billing');
    expect(activeTabHref('/org/acme/billing/invoices', tabs)).toBe('/org/acme/billing/invoices');
  });

  it('is empty when the pathname is on no tab', () => {
    expect(activeTabHref('/org/acme/usage', tabs)).toBe('');
  });

  it("ignores a tab's query string", () => {
    const withAccount = tabs.map((tab) => ({ ...tab, href: `${tab.href}?account=legacy` }));
    expect(activeTabHref('/org/acme/billing/invoices', withAccount)).toBe(
      '/org/acme/billing/invoices?account=legacy'
    );
    expect(activeTabHref('/org/acme/billing', withAccount)).toBe(
      '/org/acme/billing?account=legacy'
    );
  });
});
