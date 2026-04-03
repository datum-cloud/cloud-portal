/**
 * Approximate lat/lng for Datum edge region codes.
 * Used to display POPs on a world map.
 */
export const REGION_COORDINATES: Record<string, [number, number]> = {
  'ae-north-1': [25.2, 55.3], // Dubai
  'au-east-1': [-33.9, 151.2], // Sydney
  'br-east-1': [-23.5, -46.6], // São Paulo
  'ca-east-1': [43.6, -79.4], // Toronto
  'cl-central-1': [-33.4, -70.7], // Chile (Santiago)
  'de-central-1': [50.1, 8.7], // Frankfurt
  'gb-south-1': [51.5, -0.1], // London
  'in-west-1': [19.0, 72.8], // Mumbai
  'jp-east-1': [35.6, 139.7], // Tokyo
  'nl-west-1': [52.4, 4.9], // Amsterdam
  'sg-central-1': [1.3, 103.8], // Singapore
  'us-central-1': [32.8, -96.8], // Dallas
  'us-east-1': [39.0, -77.5], // Ashburn
  'us-east-2': [40.7, -74.0], // New York City
  'us-east4': [40.7, -74.0], // Staging
  'us-west-1': [37.3, -121.9], // San Jose, California
  'za-central-1': [-26.2, 28.0], // Johannesburg
};

/**
 * Get [lat, lng] for a region code, or null if unknown.
 * Handles zone suffixes (e.g. us-east1-b -> us-east1).
 */
export function getRegionCoordinates(regionCode: string): [number, number] | null {
  const normalized = regionCode.toLowerCase().replace(/-[a-z]$/, ''); // strip zone suffix
  return REGION_COORDINATES[normalized] ?? REGION_COORDINATES[regionCode.toLowerCase()] ?? null;
}
