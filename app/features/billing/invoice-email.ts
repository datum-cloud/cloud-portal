/**
 * Where a billing account's invoices are emailed.
 *
 * Stripe sends each invoice to a single address, the Stripe customer's
 * email, and stripe-provider sets that to the first entry of
 * `spec.contactInfo.invoiceEmails`, or the billing contact's email when
 * the list is empty. That holds whether the account pays by card or on
 * payment terms, so the portal keeps the list to one entry and shows that
 * one address as where invoices go.
 */
import type { BillingAccount } from './types';

type ContactInfo = NonNullable<BillingAccount['spec']>['contactInfo'];

/** The address invoices are emailed to, or undefined when there is none. */
export function invoiceEmail(contact: ContactInfo | undefined): string | undefined {
  return contact?.invoiceEmails?.[0] || contact?.email || undefined;
}

/**
 * The account's contact details with `email` as its invoice email. An
 * empty `email` clears it, so invoices go to the billing contact.
 *
 * The whole contact block is returned because billing doesn't keep fields
 * left out of a contactInfo patch.
 */
export function withInvoiceEmail(contact: ContactInfo | undefined, email: string) {
  const trimmed = email.trim().toLowerCase();
  return {
    name: contact?.name,
    businessName: contact?.businessName,
    email: contact?.email,
    invoiceEmails: trimmed ? [trimmed] : [],
    address: contact?.address,
  };
}
