import { getRegionCoordinates, normalizeRegionCode } from './region-coordinates';
import type { Location } from '@/resources/locations';

export type ActivePop = {
  value: string;
  city: string;
  cityCode?: string;
  country?: string;
  region: string;
  tooltip: string;
  subtitle: string;
  coords: [number, number] | null;
};

function uniqueJoin(parts: Array<string | undefined>): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out.join(' · ');
}

function locationMatchKeys(location: Location): string[] {
  return [location.name, location.region, location.locationLabel]
    .filter((key): key is string => !!key?.trim())
    .map((key) => normalizeRegionCode(key));
}

export function buildLocationIndex(locations: Location[]): Map<string, Location> {
  const index = new Map<string, Location>();
  for (const location of locations) {
    for (const key of locationMatchKeys(location)) {
      if (!index.has(key)) {
        index.set(key, location);
      }
    }
  }
  return index;
}

export function enrichActivePops(regionValues: string[], locations: Location[]): ActivePop[] {
  const index = buildLocationIndex(locations);

  return regionValues.map((value) => {
    const location = index.get(normalizeRegionCode(value)) ?? index.get(value.toLowerCase());
    const city = location?.city || location?.cityCode || location?.name || value;
    const region = location?.region || location?.name || value;
    const cityCode = location?.cityCode;
    const country = location?.country;
    const coords = location?.coords ?? getRegionCoordinates(value);

    return {
      value,
      city,
      cityCode,
      country,
      region,
      tooltip: uniqueJoin([cityCode, country, region]) || value,
      subtitle: uniqueJoin([cityCode, country]) || region,
      coords,
    };
  });
}
