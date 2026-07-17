import { usePlacesAutocomplete, type PlaceSuggestion } from './use-places-autocomplete';
import { BILLING_COUNTRIES, BILLING_PRIORITY_COUNTRY_CODES } from '@/features/billing/constants';
import { useFormMetadata } from '@conform-to/react';
import { Form, useFieldContext, useWatch } from '@datum-cloud/datum-ui/form';
import { SelectSeparator } from '@datum-cloud/datum-ui/select';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

type AddressFieldsLayout = 'stack' | 'grid';

interface AddressFieldsProps {
  /**
   * Visual layout for address rows. `stack` matches onboarding/billing dialogs;
   * `grid` matches the org settings contact card two-column address block.
   */
  layout?: AddressFieldsLayout;
  /** When false, country is omitted (caller renders it elsewhere). Default true. */
  includeCountry?: boolean;
  /** Marks country required (billing). Contact forms leave this false. */
  countryRequired?: boolean;
  /** Country options for the select. Defaults to BILLING_COUNTRIES. */
  countries?: Array<{ value: string; label: string }>;
  /** Prefix for `data-e2e` attrs, e.g. `org-contact` → `org-contact-line1`. */
  dataE2ePrefix?: string;
  /** Optional class on the outermost wrapper. */
  className?: string;
}

function e2eAttr(prefix: string | undefined, field: string): string | undefined {
  return prefix ? `${prefix}-${field}` : undefined;
}

/**
 * Shared postal-address fields with optional Google Places autocomplete on
 * Address line 1. Must render inside a Form.Root that owns
 * `country` / `line1` / `line2` / `city` / `region` / `postalCode`.
 */
export function AddressFields({
  layout = 'stack',
  includeCountry = true,
  countryRequired = false,
  countries = BILLING_COUNTRIES,
  dataE2ePrefix,
  className,
}: AddressFieldsProps) {
  const { priorityItems, otherItems } = useMemo(() => {
    const prioritySet = new Set<string>(BILLING_PRIORITY_COUNTRY_CODES);
    const priority: typeof countries = [];
    const others: typeof countries = [];
    for (const country of countries) {
      if (prioritySet.has(country.value)) {
        priority.push(country);
      } else {
        others.push(country);
      }
    }
    return { priorityItems: priority, otherItems: others };
  }, [countries]);

  const showCountrySeparator = priorityItems.length > 0 && otherItems.length > 0;
  const isGrid = layout === 'grid';

  const countryField = includeCountry ? (
    <Form.Field
      name="country"
      label="Country or region"
      description={isGrid ? 'Helps us determine billing region and tax rules.' : undefined}
      required={countryRequired}
      className={isGrid ? undefined : 'max-w-md'}>
      <Form.Select placeholder="Select a country">
        {priorityItems.map((country) => (
          <Form.SelectItem key={country.value} value={country.value}>
            {country.label}
          </Form.SelectItem>
        ))}
        {showCountrySeparator && <SelectSeparator />}
        {otherItems.map((country) => (
          <Form.SelectItem key={country.value} value={country.value}>
            {country.label}
          </Form.SelectItem>
        ))}
      </Form.Select>
    </Form.Field>
  ) : null;

  const line1Field = (
    <Form.Field name="line1" label="Address line 1">
      <AddressLine1Field dataE2e={e2eAttr(dataE2ePrefix, 'line1')} />
    </Form.Field>
  );

  const line2Field = (
    <Form.Field name="line2" label="Address line 2">
      <Form.Input autoComplete="address-line2" data-e2e={e2eAttr(dataE2ePrefix, 'line2')} />
    </Form.Field>
  );

  const cityField = (
    <Form.Field name="city" label="City" className={isGrid ? undefined : 'sm:w-1/2'}>
      <Form.Input autoComplete="address-level2" data-e2e={e2eAttr(dataE2ePrefix, 'city')} />
    </Form.Field>
  );

  const regionField = (
    <Form.Field name="region" label="State / Region" className={isGrid ? undefined : 'sm:w-1/2'}>
      <Form.Input autoComplete="address-level1" data-e2e={e2eAttr(dataE2ePrefix, 'region')} />
    </Form.Field>
  );

  const postalField = (
    <Form.Field name="postalCode" label="Postal code" className={isGrid ? undefined : 'max-w-xs'}>
      <Form.Input autoComplete="postal-code" data-e2e={e2eAttr(dataE2ePrefix, 'postal-code')} />
    </Form.Field>
  );

  if (isGrid) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {countryField}
          {line1Field}
          {line2Field}
          {cityField}
          {regionField}
          {postalField}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {countryField}
      {line1Field}
      {line2Field}
      <div className="flex w-full flex-col gap-4 sm:flex-row">
        {cityField}
        {regionField}
      </div>
      {postalField}
    </div>
  );
}

/**
 * Address line 1: plain Form.Input (matches sibling fields) with an inline
 * Places suggestions list when Google Maps is configured.
 *
 * Avoids datum-ui Autosearch/Autocomplete — those swap to a selected "card"
 * and surface a destructive empty-state icon that doesn't fit free-text address entry.
 *
 * Field writes go through Conform `form.update()` so the real Form.Input
 * controls stay in sync. Extra `useField()` hooks create a second
 * useInputControl that races the Form.Field control and drops the first select.
 */
function AddressLine1Field({ dataE2e }: { dataE2e?: string }) {
  const { name, disabled } = useFieldContext();
  const form = useFormMetadata();

  const country = (useWatch('country') as string | undefined) ?? '';
  const line1Value = String((useWatch(name) as string | undefined) ?? '');

  const {
    enabled,
    isLoading,
    suggestions,
    onQueryChange,
    selectSuggestion,
    clearSuggestions,
    cancelPendingQuery,
    countryFilterActive,
  } = usePlacesAutocomplete({ countryCode: country });

  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const skipNextQueryRef = useRef(false);
  const applyingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef(country);
  countryRef.current = country;

  useEffect(() => {
    if (!enabled) return;
    if (skipNextQueryRef.current) {
      skipNextQueryRef.current = false;
      return;
    }
    onQueryChange(line1Value);
  }, [enabled, line1Value, onQueryChange]);

  useEffect(() => {
    setActiveIndex(-1);
    setListOpen(suggestions.length > 0);
  }, [suggestions]);

  useEffect(() => {
    if (!listOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (applyingRef.current) return;
      if (!containerRef.current?.contains(event.target as Node)) {
        setListOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [listOpen]);

  const applyPlace = useCallback(
    async (suggestion: PlaceSuggestion) => {
      if (applyingRef.current) return;
      applyingRef.current = true;

      cancelPendingQuery();
      skipNextQueryRef.current = true;
      setListOpen(false);
      clearSuggestions();

      const fallbackLine1 = suggestion.primaryText.trim();
      // Optimistic update so the input doesn't stay on the typed query while
      // Place Details loads. Conform form.update syncs every Form.Input control.
      if (fallbackLine1) {
        form.update({ name: 'line1', value: fallbackLine1 });
      }

      try {
        const mapped = await selectSuggestion(suggestion);

        skipNextQueryRef.current = true;
        const nextLine1 = mapped?.line1 || fallbackLine1;
        const secondaryStreet = suggestion.secondaryText.split(',')[0]?.trim() || '';
        const nextLine2 = mapped?.line2 || secondaryStreet;

        // Single update payload avoids racing multiple hidden-submit intents.
        const nextValues: Record<string, string> = {};
        if (nextLine1) nextValues.line1 = nextLine1;
        if (nextLine2) nextValues.line2 = nextLine2;
        if (mapped?.city) nextValues.city = mapped.city;
        if (mapped?.region) nextValues.region = mapped.region;
        if (mapped?.postalCode) nextValues.postalCode = mapped.postalCode;
        if (mapped?.country && !countryRef.current) {
          nextValues.country = mapped.country;
        }

        for (const [fieldName, value] of Object.entries(nextValues)) {
          form.update({ name: fieldName, value });
        }
      } finally {
        applyingRef.current = false;
      }
    },
    [cancelPendingQuery, clearSuggestions, selectSuggestion, form]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!listOpen || suggestions.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        return;
      }
      if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        void applyPlace(suggestions[activeIndex]!);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setListOpen(false);
      }
    },
    [listOpen, suggestions, activeIndex, applyPlace]
  );

  if (!enabled) {
    return <Form.Input autoComplete="address-line1" data-e2e={dataE2e} />;
  }

  const showList = listOpen && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative" data-e2e={dataE2e}>
      <Form.Input
        autoComplete="address-line1"
        disabled={disabled}
        placeholder={
          countryFilterActive
            ? 'Search for an address'
            : 'Select a country first to search addresses'
        }
        onFocus={() => {
          if (suggestions.length > 0) setListOpen(true);
        }}
        onKeyDown={onKeyDown}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? `${name}-places-list` : undefined}
      />
      {showList && (
        <ul
          id={`${name}-places-list`}
          role="listbox"
          className="border-border bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border py-1 shadow-md">
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={cn(
                  'hover:bg-accent hover:text-accent-foreground flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs',
                  index === activeIndex && 'bg-accent text-accent-foreground'
                )}
                // Select on mouse/pointer down so the handler runs before the
                // list unmounts; preventDefault keeps focus in the input.
                onMouseDown={(event) => {
                  event.preventDefault();
                  void applyPlace(suggestion);
                }}>
                <span className="font-medium">{suggestion.primaryText}</span>
                {suggestion.secondaryText ? (
                  <span className="text-muted-foreground">{suggestion.secondaryText}</span>
                ) : null}
              </button>
            </li>
          ))}
          {isLoading ? (
            <li className="text-muted-foreground px-3 py-2 text-xs" aria-hidden>
              Searching…
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
