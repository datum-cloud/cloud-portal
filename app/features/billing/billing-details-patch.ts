import type { BillingDetailsValues } from './cards/billing-details-card';

/**
 * The `spec.contactInfo` and `spec.taxIds` the billing details form saves.
 *
 * The account is patched with a JSON Merge Patch, which keeps any key the
 * patch leaves out, and the form submits an emptied field as undefined. So a
 * cleared optional field is sent as null, which removes it; leaving it out
 * would keep the old value.
 */
export function billingDetailsPatch(values: BillingDetailsValues) {
  const invoiceEmail = values.invoiceEmail?.trim().toLowerCase();
  const orNull = (value: string | undefined) => value?.trim() || null;
  return {
    contactInfo: {
      email: values.email.trim(),
      name: orNull(values.name),
      businessName: orNull(values.businessName),
      invoiceEmails: invoiceEmail ? [invoiceEmail] : [],
      address: {
        country: values.country,
        line1: orNull(values.line1),
        line2: orNull(values.line2),
        city: orNull(values.city),
        region: orNull(values.region),
        postalCode: orNull(values.postalCode),
      },
    },
    taxIds: values.taxIds,
  };
}
