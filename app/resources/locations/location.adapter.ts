import {
  LABEL_LOCATION,
  TOPOLOGY_CITY,
  TOPOLOGY_CITY_CODE,
  TOPOLOGY_COUNTRY,
  TOPOLOGY_COUNTRY_CODE,
  TOPOLOGY_PROVINCE,
  TOPOLOGY_PROVINCE_CODE,
  TOPOLOGY_REGION,
  TOPOLOGY_TIMEZONE,
  type Location,
} from './location.schema';
import type { ComMiloapisLocationsV1Alpha1Location } from '@/modules/control-plane/locations';

function parseCoordinate(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCoordinates(
  coordinates?: { latitude?: string; longitude?: string } | null
): [number, number] | null {
  const latitude = parseCoordinate(coordinates?.latitude);
  const longitude = parseCoordinate(coordinates?.longitude);
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return [latitude, longitude];
}

export function toLocation(raw: ComMiloapisLocationsV1Alpha1Location): Location {
  const topology = raw.spec?.topology ?? {};
  const labels = raw.metadata?.labels ?? {};

  return {
    name: raw.metadata?.name ?? '',
    region: topology[TOPOLOGY_REGION],
    city: topology[TOPOLOGY_CITY],
    cityCode: topology[TOPOLOGY_CITY_CODE],
    country: topology[TOPOLOGY_COUNTRY],
    countryCode: topology[TOPOLOGY_COUNTRY_CODE],
    province: topology[TOPOLOGY_PROVINCE],
    provinceCode: topology[TOPOLOGY_PROVINCE_CODE],
    timezone: topology[TOPOLOGY_TIMEZONE],
    locationLabel: labels[LABEL_LOCATION],
    coords: parseCoordinates(raw.spec?.coordinates),
  };
}

export function toLocationList(items: ComMiloapisLocationsV1Alpha1Location[]): Location[] {
  return items.map(toLocation);
}
