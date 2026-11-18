import { BILLING_COUNTRIES, BILLING_PRIORITY_COUNTRY_CODES } from '@/features/billing/constants';
import type { AutocompleteGroup, AutocompleteOption } from '@datum-cloud/datum-ui/autocomplete';
import { Form } from '@datum-cloud/datum-ui/form';
import { useMemo } from 'react';

type CountryOption = { value: string; label: string };

/**
 * Groups countries for the picker: the markets we bill into most often
 * first, then every country A–Z. The popular ones appear in both groups so
 * someone scrolling the full list still finds their country where they
 * expect it.
 */
export function groupCountryOptions(
  countries: ReadonlyArray<CountryOption>
): AutocompleteGroup<AutocompleteOption>[] {
  const prioritySet = new Set<string>(BILLING_PRIORITY_COUNTRY_CODES);
  const popular = countries.filter((country) => prioritySet.has(country.value));
  const all = [...countries].sort((a, b) => a.label.localeCompare(b.label));

  return popular.length > 0
    ? [
        { label: 'Popular', options: popular },
        { label: 'All countries', options: all },
      ]
    : [{ label: 'All countries', options: all }];
}

interface CountryAutocompleteProps {
  /** Country options. Defaults to BILLING_COUNTRIES. */
  countries?: ReadonlyArray<CountryOption>;
  /** Set when rendered inside a Dialog so the popover can take focus. */
  modal?: boolean;
}

/**
 * Searchable country picker. Must render inside a `Form.Field`. On small
 * screens it opens as a bottom sheet rather than a popover.
 */
export function CountryAutocomplete({
  countries = BILLING_COUNTRIES,
  modal,
}: CountryAutocompleteProps) {
  const options = useMemo(() => groupCountryOptions(countries), [countries]);

  return (
    <Form.Autocomplete
      options={options}
      placeholder="Select a country"
      searchPlaceholder="Search countries..."
      sheetTitle="Country"
      emptyContent="No matching country"
      modal={modal}
    />
  );
}
