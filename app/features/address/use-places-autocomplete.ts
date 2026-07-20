import { mapPlaceAddressComponents, type MappedAddress } from './places-address-mapper';
import { env } from '@/utils/env';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useCallback, useEffect, useRef, useState } from 'react';

export type PlaceSuggestion = {
  id: string;
  primaryText: string;
  secondaryText: string;
  prediction: google.maps.places.PlacePrediction;
};

let mapsOptionsConfigured = false;

/** Prefer live `window.ENV` — the universal `env` module snapshots at import time. */
function getMapsApiKey(): string | undefined {
  if (typeof window !== 'undefined') {
    return window.ENV?.googleMapsApiKey?.trim() || undefined;
  }
  return env.public.googleMapsApiKey?.trim() || undefined;
}

async function ensurePlacesLibrary(): Promise<google.maps.PlacesLibrary | null> {
  const apiKey = getMapsApiKey();
  if (!apiKey) return null;

  if (!mapsOptionsConfigured) {
    setOptions({ key: apiKey, v: 'weekly' });
    mapsOptionsConfigured = true;
  }

  return importLibrary('places');
}

function suggestionId(prediction: google.maps.places.PlacePrediction, index: number): string {
  // placeId is preferred; fall back to text + index for stability within a result set.
  return prediction.placeId || `${prediction.text?.toString() ?? 'place'}-${index}`;
}

function toSuggestion(
  suggestion: google.maps.places.AutocompleteSuggestion,
  index: number
): PlaceSuggestion | null {
  const prediction = suggestion.placePrediction;
  if (!prediction) return null;

  return {
    id: suggestionId(prediction, index),
    primaryText: prediction.mainText?.toString() ?? prediction.text?.toString() ?? '',
    secondaryText: prediction.secondaryText?.toString() ?? '',
    prediction,
  };
}

/**
 * Places API (New) autocomplete for address line 1. No-ops when
 * `GOOGLE_MAPS_API_KEY` is unset — callers keep plain manual entry.
 *
 * Results are hard-filtered to `countryCode` via `includedRegionCodes`.
 * Without a valid ISO-3166-1 alpha-2 country, suggestions stay empty so we
 * never return unfiltered worldwide matches.
 */
export function usePlacesAutocomplete(options?: { countryCode?: string }) {
  const rawCountry = options?.countryCode?.trim().toUpperCase() || '';
  const countryCode = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : undefined;
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Re-check on each render so a late window.ENV hydrate still enables Places.
  const enabled = Boolean(getMapsApiKey());

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const ensureSessionToken = useCallback(async () => {
    const places = await ensurePlacesLibrary();
    if (!places) return null;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new places.AutocompleteSessionToken();
    }
    return { places, token: sessionTokenRef.current };
  }, []);

  const search = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      // Require a selected country — includedRegionCodes is the only hard
      // country filter Places Autocomplete (New) exposes.
      if (!getMapsApiKey() || trimmed.length < 3 || !countryCode) {
        setSuggestions([]);
        return;
      }

      const requestId = ++requestIdRef.current;
      setIsLoading(true);

      try {
        const session = await ensureSessionToken();
        if (!session) {
          setSuggestions([]);
          return;
        }

        const { AutocompleteSuggestion } = session.places;
        const request: google.maps.places.AutocompleteRequest = {
          input: trimmed,
          sessionToken: session.token,
          // CLDR region codes; empty array does not restrict — always set when searching.
          includedRegionCodes: [countryCode.toLowerCase()],
        };

        const { suggestions: next } =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (requestId !== requestIdRef.current) return;

        setSuggestions(
          next.map((s, i) => toSuggestion(s, i)).filter((s): s is PlaceSuggestion => s !== null)
        );
      } catch (error) {
        // Degrade to manual entry — never block the form on Places errors.
        if (import.meta.env.DEV) {
          console.warn('[places] autocomplete failed', error);
        }
        if (requestId === requestIdRef.current) {
          setSuggestions([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [countryCode, ensureSessionToken]
  );

  const onQueryChange = useCallback(
    (input: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!getMapsApiKey() || !countryCode) {
        setSuggestions([]);
        return;
      }
      debounceRef.current = setTimeout(() => {
        void search(input);
      }, 250);
    },
    [search, countryCode]
  );

  const cancelPendingQuery = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Invalidate in-flight autocomplete responses so they can't repopulate
    // suggestions after the user has already picked one.
    requestIdRef.current += 1;
    setIsLoading(false);
  }, []);

  // Drop stale results when the country filter changes (e.g. US → GB).
  useEffect(() => {
    cancelPendingQuery();
    setSuggestions([]);
    sessionTokenRef.current = null;
  }, [countryCode, cancelPendingQuery]);

  const selectSuggestion = useCallback(
    async (suggestion: PlaceSuggestion): Promise<MappedAddress | null> => {
      if (!getMapsApiKey()) return null;

      try {
        const place = suggestion.prediction.toPlace();
        // Prefer full details for establishment name handling; fall back to
        // address-only fields if the broader mask is rejected.
        try {
          await place.fetchFields({
            fields: ['addressComponents', 'postalAddress', 'displayName', 'types'],
          });
        } catch (detailsError) {
          if (import.meta.env.DEV) {
            console.warn('[places] full place details failed; retrying essentials', detailsError);
          }
          await place.fetchFields({ fields: ['addressComponents', 'postalAddress'] });
        }

        const components = place.addressComponents ?? [];
        const postal = place.postalAddress;
        const mapped = mapPlaceAddressComponents(
          components.map((c) => ({
            longText: c.longText ?? null,
            shortText: c.shortText ?? null,
            types: Array.isArray(c.types) ? [...c.types] : [],
          })),
          postal
            ? {
                addressLines: postal.addressLines,
                administrativeArea: postal.administrativeArea,
                locality: postal.locality,
                postalCode: postal.postalCode,
                regionCode: postal.regionCode,
                sublocality: postal.sublocality,
              }
            : null,
          {
            placeName: place.displayName || suggestion.primaryText,
            placeTypes: place.types ?? [],
          }
        );
        sessionTokenRef.current = null;
        setSuggestions([]);
        return mapped;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[places] place details failed', error);
        }
        setSuggestions([]);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    enabled,
    isLoading,
    suggestions,
    onQueryChange,
    selectSuggestion,
    clearSuggestions,
    cancelPendingQuery,
    /** True when Places is configured and a country filter is active. */
    countryFilterActive: Boolean(countryCode),
  };
}
