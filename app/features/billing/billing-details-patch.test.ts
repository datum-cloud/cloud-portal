import { billingDetailsPatch } from './billing-details-patch';
import type { BillingDetailsValues } from './cards/billing-details-card';
import { describe, expect, it } from 'vitest';

const values: BillingDetailsValues = {
  displayName: 'Acme billing',
  name: 'Jane Doe',
  businessName: 'Acme Ltd',
  email: 'jane@acme.com',
  invoiceEmail: ' AP@Acme.com ',
  country: 'GB',
  line1: '1 Main St',
  line2: 'Floor 2',
  city: 'London',
  region: '',
  postalCode: 'N1 1AA',
  taxIds: [{ type: 'gb_vat', value: 'GB123456789' }],
};

describe('billingDetailsPatch', () => {
  it('saves the contact email and one lower-cased invoice email', () => {
    expect(billingDetailsPatch(values)).toEqual({
      contactInfo: {
        email: 'jane@acme.com',
        name: 'Jane Doe',
        businessName: 'Acme Ltd',
        invoiceEmails: ['ap@acme.com'],
        address: {
          country: 'GB',
          line1: '1 Main St',
          line2: 'Floor 2',
          city: 'London',
          region: null,
          postalCode: 'N1 1AA',
        },
      },
      taxIds: [{ type: 'gb_vat', value: 'GB123456789' }],
    });
  });

  it('sends null for cleared fields, so the merge patch removes them', () => {
    const patch = billingDetailsPatch({
      ...values,
      name: undefined,
      businessName: undefined,
      invoiceEmail: undefined,
      line2: undefined,
      taxIds: [],
    });
    expect(patch.contactInfo.name).toBeNull();
    expect(patch.contactInfo.businessName).toBeNull();
    expect(patch.contactInfo.address.line2).toBeNull();
    expect(patch.contactInfo.invoiceEmails).toEqual([]);
    expect(patch.taxIds).toEqual([]);
    // JSON keeps nulls, where undefined keys would be dropped.
    const sent = JSON.parse(JSON.stringify(patch)) as typeof patch;
    expect(sent.contactInfo).toHaveProperty('name', null);
  });
});
