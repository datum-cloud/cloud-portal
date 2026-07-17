/**
 * Maps Google Places (New) address components into our contact/billing form shape.
 * Kept free of the Maps runtime so unit tests can pass plain objects.
 */

export type PlaceAddressComponentLike = {
  longText: string | null;
  shortText: string | null;
  types: string[];
};

/** Subset of Places `PostalAddress` used to fill gaps components omit. */
export type PostalAddressLike = {
  addressLines?: readonly string[] | null;
  administrativeArea?: string | null;
  locality?: string | null;
  postalCode?: string | null;
  regionCode?: string | null;
  sublocality?: string | null;
};

export type MappedAddress = {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  /** ISO-3166-1 alpha-2, uppercase when present. */
  country: string;
};

export type MapPlaceOptions = {
  /**
   * Autocomplete main text or Place.displayName (e.g. "The Shard").
   * Used as line 1 when it names a place rather than the street itself.
   */
  placeName?: string | null;
  /** Place.types from Place Details — establishment, point_of_interest, etc. */
  placeTypes?: readonly string[] | null;
};

/** Place types that usually carry a business / landmark name distinct from the street. */
const NAMED_PLACE_TYPES = new Set([
  'establishment',
  'point_of_interest',
  'premise',
  'subpremise',
  'lodging',
  'restaurant',
  'cafe',
  'bar',
  'store',
  'shopping_mall',
  'museum',
  'tourist_attraction',
  'university',
  'school',
  'hospital',
  'health',
  'finance',
  'bank',
  'insurance_agency',
  'real_estate_agency',
  'lawyer',
  'accounting',
  'church',
  'place_of_worship',
  'local_government_office',
  'post_office',
  'library',
  'park',
  'stadium',
  'gym',
  'spa',
  'beauty_salon',
  'hair_care',
  'car_dealer',
  'car_rental',
  'car_repair',
  'gas_station',
  'parking',
  'transit_station',
  'train_station',
  'subway_station',
  'bus_station',
  'airport',
  'embassy',
]);

function componentText(
  components: PlaceAddressComponentLike[],
  type: string,
  preferShort = false
): string {
  const match = components.find((c) => c.types.includes(type));
  if (!match) return '';
  const preferred = preferShort ? match.shortText : match.longText;
  return (preferred ?? match.longText ?? match.shortText ?? '').trim();
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** True when the label looks like a street line ("73 Queens Road") rather than a place name. */
function looksLikeStreetLabel(value: string): boolean {
  return /^\d/.test(value.trim());
}

function buildStreetLine(components: PlaceAddressComponentLike[]): string {
  const streetNumber = componentText(components, 'street_number');
  const route = componentText(components, 'route');
  return [streetNumber, route].filter(Boolean).join(' ').trim();
}

/**
 * District / neighborhood for line 2 when it isn't already the city.
 * Places often put UK areas like "Clifton" here while city is the post town.
 */
function buildNeighborhoodLine(components: PlaceAddressComponentLike[], city: string): string {
  const candidates = [
    componentText(components, 'neighborhood'),
    componentText(components, 'sublocality_level_1'),
    componentText(components, 'sublocality'),
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.toLowerCase() !== city.toLowerCase()) {
      return candidate;
    }
  }

  return '';
}

/**
 * Prefer the place / business name on line 1 when Places returned a named
 * establishment (e.g. "The Shard") and a separate street — otherwise we'd
 * discard the name and only keep "London Bridge Street".
 */
function resolveLines(
  components: PlaceAddressComponentLike[],
  city: string,
  postal: PostalAddressLike | null | undefined,
  options?: MapPlaceOptions | null
): { line1: string; line2: string } {
  const street = buildStreetLine(components);
  const subpremise = componentText(components, 'subpremise');
  const premise = componentText(components, 'premise');
  const neighborhood = buildNeighborhoodLine(components, city);
  const placeName = firstNonEmpty(options?.placeName, premise);
  const types = options?.placeTypes ?? [];
  const isTypedNamedPlace = types.some((type) => NAMED_PLACE_TYPES.has(type));

  const placeIsDistinctFromStreet =
    Boolean(placeName) &&
    Boolean(street) &&
    normalizeLabel(placeName) !== normalizeLabel(street) &&
    !looksLikeStreetLabel(placeName);

  if (placeIsDistinctFromStreet && (isTypedNamedPlace || Boolean(options?.placeName))) {
    const streetWithUnit = firstNonEmpty([subpremise, street].filter(Boolean).join(', '), street);
    return {
      line1: placeName,
      line2: firstNonEmpty(streetWithUnit, neighborhood, postal?.addressLines?.[1]),
    };
  }

  // Ordinary street address: line1 = street (or premise fallback), line2 = unit / district.
  const line1 = firstNonEmpty(street, premise, subpremise, neighborhood, postal?.addressLines?.[0]);
  const line2 = firstNonEmpty(
    subpremise && street ? subpremise : '',
    !subpremise || !street ? neighborhood : '',
    postal?.addressLines?.[1],
    postal?.sublocality && postal.sublocality.toLowerCase() !== city.toLowerCase()
      ? postal.sublocality
      : ''
  );

  // When street filled line1 and subpremise wasn't used above as sole line1.
  if (street && subpremise && normalizeLabel(line1) === normalizeLabel(street)) {
    return { line1, line2: firstNonEmpty(subpremise, line2) };
  }

  return { line1, line2 };
}

export function mapPlaceAddressComponents(
  components: PlaceAddressComponentLike[],
  postal?: PostalAddressLike | null,
  options?: MapPlaceOptions | null
): MappedAddress {
  const admin1Short = componentText(components, 'administrative_area_level_1', true);
  const admin1Long = componentText(components, 'administrative_area_level_1');
  const admin2 = componentText(components, 'administrative_area_level_2');

  // City: prefer locality / postal_town. Avoid burning admin_area_level_2 here so
  // UK counties / unitary authorities can still fill region when admin1 is absent
  // (Place Details often omits England/Scotland when it's not in formattedAddress).
  let city = firstNonEmpty(
    componentText(components, 'locality'),
    componentText(components, 'postal_town'),
    componentText(components, 'sublocality_level_1'),
    componentText(components, 'sublocality'),
    postal?.locality
  );

  let region = firstNonEmpty(admin1Short, admin1Long, postal?.administrativeArea, admin2);

  // If region fell back to the same admin2 we'd otherwise use as city, keep region
  // and leave city to postal/locality only — never duplicate into both.
  if (!city && admin2 && admin2.toLowerCase() !== region.toLowerCase()) {
    city = admin2;
  } else if (!city && admin2 && !admin1Short && !admin1Long && !postal?.administrativeArea) {
    // Unitary authority as the only political name (e.g. some UK places): use as city.
    city = admin2;
    region = firstNonEmpty(postal?.administrativeArea);
  }

  const { line1, line2 } = resolveLines(components, city, postal, options);
  const postalCode = firstNonEmpty(componentText(components, 'postal_code'), postal?.postalCode);
  const country = firstNonEmpty(
    componentText(components, 'country', true),
    postal?.regionCode
  ).toUpperCase();

  return { line1, line2, city, region, postalCode, country };
}
