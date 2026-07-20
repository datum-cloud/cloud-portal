import {
  defaultOnboardingProjectDisplayName,
  orgDisplayNameFromContact,
} from './org-contact-info-schema';
import { describe, expect, it } from 'bun:test';

const sampleContact = {
  email: 'jane@example.com',
  name: 'Jane Doe',
  businessName: 'Acme Corp',
  country: 'US',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
};

describe('defaultOnboardingProjectDisplayName', () => {
  it('uses a neutral default distinct from the org display name', () => {
    expect(defaultOnboardingProjectDisplayName(sampleContact)).toBe('Default project');
    expect(defaultOnboardingProjectDisplayName(sampleContact)).not.toBe(
      orgDisplayNameFromContact(sampleContact)
    );
  });
});
