import {
  buildOrgContactDefaults,
  orgContactInfoToFormValues,
  type OrgContactInfoValues,
} from './org-contact-info-schema';
import type { BillingAccount } from '@/features/billing/types';
import type { Organization } from '@/resources/organizations';

/** Contact details saved on a billing account, when its email and name are set. */
export function contactInfoFromBillingAccount(
  account: BillingAccount
): OrgContactInfoValues | undefined {
  const contact = account.spec?.contactInfo;
  if (!contact?.email?.trim() || !contact.name?.trim()) {
    return undefined;
  }

  return buildOrgContactDefaults({
    email: contact.email,
    name: contact.name,
    businessName: contact.businessName ?? '',
    country: contact.address?.country ?? '',
    line1: contact.address?.line1 ?? '',
    line2: contact.address?.line2 ?? '',
    city: contact.address?.city ?? '',
    region: contact.address?.region ?? '',
    postalCode: contact.address?.postalCode ?? '',
  });
}

/** Contact details saved on an organization, when its email and name are set. */
export function contactInfoFromOrganization(
  org: Pick<Organization, 'contactInfo'>
): OrgContactInfoValues | undefined {
  const values = orgContactInfoToFormValues(org.contactInfo);
  if (!values.email?.trim() || !values.name?.trim()) {
    return undefined;
  }
  return buildOrgContactDefaults(values);
}
