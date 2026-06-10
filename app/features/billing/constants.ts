/**
 * Shared billing constants.
 *
 * The country list is the full ISO 3166-1 alpha-2 set, sourced from
 * `i18n-iso-countries` so the codes line up with what we send to the
 * billing API / Stripe without us having to maintain a hand-rolled
 * table. We use the "official" (canonical) name for each country —
 * the library's alias form sometimes returns abbreviations like "UK"
 * which aren't great in a formal billing context.
 */
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(enLocale);

/**
 * Markets we expect to bill into most often. Surfaced at the top of the
 * country picker (in this order) so customers don't have to scroll past
 * every G–Z country before finding their own. The rest of the world
 * follows, alphabetical.
 *
 * Order is deliberate: anchored on the US + UK (where most of our
 * traffic lives), then the rest of the English-speaking and Western
 * European markets. Tweak freely — anything not in this list still
 * shows up below, just in alphabetical order.
 */
/**
 * Exported so the country picker can split items into the priority
 * block (rendered first) and the alphabetical "rest of the world"
 * block (rendered after a `<SelectSeparator>`). Anything in this list
 * is treated as "above the line" wherever the picker renders.
 */
export const BILLING_PRIORITY_COUNTRY_CODES: ReadonlyArray<string> = [
  'US',
  'GB',
  'CA',
  'AU',
  'IE',
  'DE',
  'FR',
  'ES',
  'IT',
  'NL',
];

const ALL_COUNTRY_NAMES = countries.getNames('en', { select: 'official' });

const priorityCountries = BILLING_PRIORITY_COUNTRY_CODES.filter(
  (code) => code in ALL_COUNTRY_NAMES
).map((code) => ({ value: code, label: ALL_COUNTRY_NAMES[code] as string }));

const prioritySet = new Set<string>(BILLING_PRIORITY_COUNTRY_CODES);

const otherCountries = Object.entries(ALL_COUNTRY_NAMES)
  .filter(([code]) => !prioritySet.has(code))
  .map(([value, label]) => ({ value, label: label as string }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const BILLING_COUNTRIES: Array<{ value: string; label: string }> = [
  ...priorityCountries,
  ...otherCountries,
];

/**
 * Tax ID types we currently surface. Values follow the
 * vendor-neutral `<jurisdiction>_<scheme>` convention validated by the
 * billing service (`api/v1alpha1.TaxID.Type`); the provider controller
 * translates these to any provider-specific identifier on its way to
 * Stripe / Braintree / …
 */
export const BUSINESS_TAX_ID_TYPES: Array<{ value: string; label: string }> = [
  { value: 'gb_vat', label: 'United Kingdom VAT' },
  { value: 'eu_vat', label: 'EU VAT' },
  { value: 'us_ein', label: 'United States EIN' },
  { value: 'ca_gst_hst', label: 'Canada GST/HST' },
  { value: 'au_abn', label: 'Australia ABN' },
  { value: 'ch_vat', label: 'Switzerland VAT' },
  { value: 'in_gst', label: 'India GST' },
  { value: 'sg_gst', label: 'Singapore GST' },
];
