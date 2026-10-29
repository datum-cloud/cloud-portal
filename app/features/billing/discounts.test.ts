import { formatDiscountPercentage, summarizeDiscounts, type AccountDiscount } from './discounts';
import { describe, expect, it } from 'bun:test';

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
