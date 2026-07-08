import type { StripeAddressElementChangeEvent } from '@stripe/stripe-js';

/** Billing address prefill, e.g. copied from the org contact information. */
export interface StripeBillingAddressPrefill {
  line1?: string;
  line2?: string;
  city?: string;
  /** State / province / region. */
  state?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2 country code (e.g. `GB`). */
  country?: string;
}

/**
 * Flat contact address, as edited by the org contact / billing-account contact
 * forms. Fields are optional and may arrive as `null` from the API.
 */
export interface ContactAddressInput {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  /** Free-text state / region — mapped to `state` on the Stripe prefill. */
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

/**
 * Maps a flat contact address to the Stripe address prefill.
 *
 * Returns `undefined` unless a real address was entered (a street line, city,
 * or postal code) — a bare defaulted country isn't worth offering as a "copy
 * from contact" source, and callers use the `undefined` result to hide the
 * "Same as contact address" toggle.
 */
export const buildContactAddressPrefill = (
  contact: ContactAddressInput | null | undefined
): StripeBillingAddressPrefill | undefined => {
  const line1 = contact?.line1?.trim();
  const city = contact?.city?.trim();
  const postalCode = contact?.postalCode?.trim();

  if (!line1 && !city && !postalCode) return undefined;

  return {
    line1: line1 || undefined,
    line2: contact?.line2?.trim() || undefined,
    city: city || undefined,
    state: contact?.region?.trim() || undefined,
    postalCode: postalCode || undefined,
    country: contact?.country?.trim() || undefined,
  };
};

const normalizeAddressPart = (value?: string | null): string => (value ?? '').trim().toUpperCase();

/**
 * A stable, case/whitespace-insensitive signature of the AddressElement's
 * current value. Used to detect manual edits without diffing against our raw
 * contact values — the element renders different fields per country (a US
 * state dropdown + ZIP vs a UK postcode with no state), so the only reliable
 * baseline is whatever Stripe itself keeps for the chosen country.
 */
export const addressSignature = (value: StripeAddressElementChangeEvent['value']): string => {
  const a = value.address;
  return [
    normalizeAddressPart(value.name),
    normalizeAddressPart(a.line1),
    normalizeAddressPart(a.line2),
    normalizeAddressPart(a.city),
    normalizeAddressPart(a.state),
    normalizeAddressPart(a.postal_code),
    normalizeAddressPart(a.country),
  ].join('|');
};
