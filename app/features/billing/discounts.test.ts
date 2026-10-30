import {
  accountDiscounts,
  formatDiscountPercentage,
  summarizeDiscounts,
  type AccountDiscount,
} from './discounts';
import type { BillingAccount } from './types';
import { describe, expect, it } from 'vitest';

const discount = (serviceDisplayName: string, percentage: number): AccountDiscount => ({
  serviceDisplayName,
  percentage,
});

describe('summarizeDiscounts', () => {
  it('shows nothing without a discount above 0%', () => {
    expect(summarizeDiscounts([])).toBeUndefined();
    expect(summarizeDiscounts([discount('DNS', 0), discount('Edge', 0)])).toBeUndefined();
  });

  it('collapses a single percentage across every service into one line', () => {
    expect(summarizeDiscounts([discount('DNS', 20), discount('Edge', 20)])).toEqual({
      kind: 'uniform',
      percentage: 20,
    });
    expect(summarizeDiscounts([discount('DNS', 15)])).toEqual({
      kind: 'uniform',
      percentage: 15,
    });
  });

  it('lists services by name when percentages differ', () => {
    expect(
      summarizeDiscounts([discount('Edge', 10), discount('DNS', 25), discount('Compute', 5)])
    ).toEqual({
      kind: 'perService',
      items: [discount('Compute', 5), discount('DNS', 25), discount('Edge', 10)],
    });
  });

  it('leaves out services with no discount', () => {
    expect(summarizeDiscounts([discount('DNS', 20), discount('Edge', 0)])).toEqual({
      kind: 'perService',
      items: [discount('DNS', 20)],
    });
  });
});

describe('formatDiscountPercentage', () => {
  it('drops trailing zeros and keeps up to two decimals', () => {
    expect(formatDiscountPercentage(20)).toBe('20%');
    expect(formatDiscountPercentage(12.5)).toBe('12.5%');
    expect(formatDiscountPercentage(33.333)).toBe('33.33%');
  });
});

describe('accountDiscounts', () => {
  const account = (
    discounts?: NonNullable<BillingAccount['status']>['discounts']
  ): BillingAccount => ({
    metadata: { name: 'acme' },
    spec: {
      currencyCode: 'USD',
      contactInfo: { email: 'jane@acme.com' },
      paymentTerms: { invoiceFrequency: 'Monthly', invoiceDayOfMonth: 1 },
    },
    status: { discounts },
  });

  it('has nothing without published discounts', () => {
    expect(accountDiscounts(undefined)).toEqual([]);
    expect(accountDiscounts(account())).toEqual([]);
  });

  it('labels each pricing by its display name, falling back to its name', () => {
    expect(
      accountDiscounts(
        account([
          { name: 'networking-alb-requests-v1', displayName: 'ALB Requests', percentage: 20 },
          { name: 'networking-alb-egress-v1', percentage: 0 },
        ])
      )
    ).toEqual([discount('ALB Requests', 20), discount('networking-alb-egress-v1', 0)]);
  });
});
