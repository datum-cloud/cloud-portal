import { orgDisplayNameFromContact } from './org-contact-info-schema';
import { describe, expect, it } from 'bun:test';

describe('orgDisplayNameFromContact', () => {
  it('prefers business name when present', () => {
    expect(
      orgDisplayNameFromContact({
        email: 'jane@example.com',
        name: 'Jane Doe',
        businessName: 'Acme Corp',
        country: 'US',
        line1: '',
        line2: '',
        city: '',
        region: '',
        postalCode: '',
      })
    ).toBe('Acme Corp');
  });

  it('falls back to contact name when business name is blank', () => {
    expect(
      orgDisplayNameFromContact({
        email: 'jane@example.com',
        name: 'Jane Doe',
        businessName: '  ',
        country: 'US',
        line1: '',
        line2: '',
        city: '',
        region: '',
        postalCode: '',
      })
    ).toBe('Jane Doe');
  });

  it('returns empty string when both are blank', () => {
    expect(
      orgDisplayNameFromContact({
        email: 'jane@example.com',
        name: '  ',
        businessName: '',
        country: 'US',
        line1: '',
        line2: '',
        city: '',
        region: '',
        postalCode: '',
      })
    ).toBe('');
  });
});
