import { addressSignature, buildContactAddressPrefill } from './billing-address';
import type { StripeAddressElementChangeEvent } from '@stripe/stripe-js';
import { describe, expect, it } from 'bun:test';

describe('buildContactAddressPrefill', () => {
  it('returns undefined for null/undefined contact', () => {
    expect(buildContactAddressPrefill(null)).toBeUndefined();
    expect(buildContactAddressPrefill(undefined)).toBeUndefined();
  });

  it('returns undefined when only a country is set (no real address)', () => {
    // A defaulted country alone should not offer "same as contact address".
    expect(buildContactAddressPrefill({ country: 'GB' })).toBeUndefined();
  });

  it('returns undefined when address fields are blank/whitespace', () => {
    expect(
      buildContactAddressPrefill({ line1: '   ', city: '', postalCode: undefined })
    ).toBeUndefined();
  });

  it('maps a full UK-style address and renames region -> state', () => {
    expect(
      buildContactAddressPrefill({
        line1: '10 Downing Street',
        line2: 'Westminster',
        city: 'London',
        region: 'Greater London',
        postalCode: 'SW1A 2AA',
        country: 'GB',
      })
    ).toEqual({
      line1: '10 Downing Street',
      line2: 'Westminster',
      city: 'London',
      state: 'Greater London',
      postalCode: 'SW1A 2AA',
      country: 'GB',
    });
  });

  it('trims values and drops empty optional fields to undefined', () => {
    expect(
      buildContactAddressPrefill({
        line1: '  1 Main St  ',
        line2: '   ',
        city: '  Austin ',
        region: null,
        postalCode: ' 78701 ',
        country: '  US ',
      })
    ).toEqual({
      line1: '1 Main St',
      line2: undefined,
      city: 'Austin',
      state: undefined,
      postalCode: '78701',
      country: 'US',
    });
  });

  it('is offered when only a street line is present', () => {
    expect(buildContactAddressPrefill({ line1: '1 Main St' })).toEqual({
      line1: '1 Main St',
      line2: undefined,
      city: undefined,
      state: undefined,
      postalCode: undefined,
      country: undefined,
    });
  });

  it('is offered when only a city is present', () => {
    expect(buildContactAddressPrefill({ city: 'Austin' })?.city).toBe('Austin');
  });

  it('is offered when only a postal code is present', () => {
    expect(buildContactAddressPrefill({ postalCode: '78701' })?.postalCode).toBe('78701');
  });
});

describe('addressSignature', () => {
  const makeValue = (
    overrides: Partial<StripeAddressElementChangeEvent['value']['address']> & { name?: string }
  ): StripeAddressElementChangeEvent['value'] =>
    ({
      name: overrides.name ?? 'Jane Doe',
      address: {
        line1: '1 Main St',
        line2: null,
        city: 'Austin',
        state: 'TX',
        postal_code: '78701',
        country: 'US',
        ...overrides,
      },
    }) as StripeAddressElementChangeEvent['value'];

  it('is stable across case and surrounding whitespace', () => {
    const a = makeValue({ name: 'Jane Doe', city: 'Austin', line1: '1 Main St' });
    const b = makeValue({ name: '  jane doe ', city: ' AUSTIN', line1: '1 main st  ' });
    expect(addressSignature(a)).toBe(addressSignature(b));
  });

  it('changes when a field value changes (manual edit)', () => {
    const before = makeValue({});
    const after = makeValue({ line1: '2 Main St' });
    expect(addressSignature(before)).not.toBe(addressSignature(after));
  });

  it('treats null and empty string the same', () => {
    const withNull = makeValue({ line2: null });
    const withEmpty = makeValue({ line2: '' });
    expect(addressSignature(withNull)).toBe(addressSignature(withEmpty));
  });

  it('distinguishes the same address in different countries', () => {
    const us = makeValue({ country: 'US', state: 'TX' });
    // UK renders no state field, so Stripe keeps state empty.
    const gb = makeValue({ country: 'GB', state: '' });
    expect(addressSignature(us)).not.toBe(addressSignature(gb));
  });
});
