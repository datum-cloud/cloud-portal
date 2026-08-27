import { formatCurrency, formatUnitRate } from './usage.format';
import { describe, expect, it } from 'bun:test';

describe('formatCurrency', () => {
  it('renders an em dash when amount is missing', () => {
    expect(formatCurrency(undefined)).toBe('—');
  });

  it('renders a bare $0 when spend is zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('uses extra fraction digits for sub-dollar amounts', () => {
    expect(formatCurrency(0.000003)).toBe('$0.000003');
  });
});

describe('formatUnitRate', () => {
  it('uses the Offer pricingUnit when provided', () => {
    expect(formatUnitRate(0.001, 'count', 'USD', 'token')).toBe('$0.0010 / token');
  });

  it('renders an em dash when no rate is available', () => {
    expect(formatUnitRate(undefined, 'count')).toBe('—');
  });

  it('renders a $0 unit rate instead of an em dash', () => {
    expect(formatUnitRate(0, 'count', 'USD', 'token')).toBe('$0 / token');
  });
});
