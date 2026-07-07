import {
  buildOrgContactDefaults,
  toOrganizationContactInfo,
  toOrganizationContactInfoPatch,
} from './org-contact-info-schema';
import { describe, expect, it } from 'bun:test';

describe('toOrganizationContactInfoPatch', () => {
  it('omits null deletes on first write with no previous contact', () => {
    const values = buildOrgContactDefaults({
      email: 'a@example.com',
      name: 'Jane Doe',
      businessName: '',
      country: 'US',
    });

    expect(toOrganizationContactInfoPatch(values, undefined)).toEqual(
      toOrganizationContactInfo(values)
    );
  });

  it('emits null for cleared business name', () => {
    const previous = {
      email: 'a@example.com',
      name: 'Jane Doe',
      businessName: 'Acme Inc',
    };
    const values = buildOrgContactDefaults({
      email: 'a@example.com',
      name: 'Jane Doe',
      businessName: '',
      country: 'US',
    });

    expect(toOrganizationContactInfoPatch(values, previous).businessName).toBeNull();
  });

  it('emits null for cleared address lines and preserves country changes', () => {
    const previous = {
      email: 'a@example.com',
      name: 'Jane Doe',
      address: {
        country: 'US',
        line1: '123 Main St',
        city: 'Boston',
      },
    };
    const values = buildOrgContactDefaults({
      email: 'a@example.com',
      name: 'Jane Doe',
      country: 'GB',
      line1: '',
      city: '',
    });

    expect(toOrganizationContactInfoPatch(values, previous)).toEqual({
      email: 'a@example.com',
      name: 'Jane Doe',
      address: {
        country: 'GB',
        line1: null,
        city: null,
      },
    });
  });

  it('clears the entire address when country is removed', () => {
    const previous = {
      email: 'a@example.com',
      name: 'Jane Doe',
      address: { country: 'US', line1: '123 Main St' },
    };
    const values = {
      email: 'a@example.com',
      name: 'Jane Doe',
      businessName: '',
      country: '',
      line1: '',
      line2: '',
      city: '',
      region: '',
      postalCode: '',
    };

    expect(toOrganizationContactInfoPatch(values, previous).address).toBeNull();
  });
});
