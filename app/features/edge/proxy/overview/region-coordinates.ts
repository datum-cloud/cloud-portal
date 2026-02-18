/**
 * Approximate lat/lng for cloud region codes (GCP, AWS-style).
 * Used to display POPs on a world map.
 * @see https://cloud.google.com/about/locations
 */
export const REGION_COORDINATES: Record<string, [number, number]> = {
  // Americas
  'us-east1': [33.2, -80.0], // South Carolina
  'us-east4': [37.4, -79.0], // Virginia
  'us-central1': [41.5, -93.6], // Iowa
  'us-west1': [45.5, -122.6], // Oregon
  'us-west2': [34.0, -118.2], // Los Angeles
  'us-west3': [40.7, -111.9], // Salt Lake City
  'us-east-1': [37.5, -77.3], // N. Virginia
  'us-east-2': [40.4, -83.0], // Ohio
  'us-west-1': [37.4, -121.9], // N. California
  'us-west-2': [45.5, -122.6], // Oregon
  'northamerica-northeast1': [45.5, -73.5], // Montreal
  'northamerica-northeast2': [43.6, -79.4], // Toronto
  'southamerica-east1': [-23.5, -46.6], // São Paulo
  'southamerica-west1': [-12.0, -77.0], // Lima
  // Europe
  'europe-west1': [50.8, 4.3], // Belgium
  'europe-west2': [51.5, -0.1], // London
  'europe-west3': [50.1, 8.7], // Frankfurt
  'europe-west4': [52.3, 4.9], // Netherlands
  'europe-west6': [47.4, 8.5], // Zurich
  'europe-west8': [45.5, 9.2], // Milan
  'europe-west9': [41.4, 2.2], // Paris
  'europe-north1': [60.2, 24.9], // Finland
  'europe-central2': [52.2, 21.0], // Warsaw
  'eu-west-1': [53.3, -6.2], // Ireland
  'eu-west-2': [51.5, -0.1], // London
  'eu-west-3': [48.9, 2.3], // Paris
  'eu-central-1': [50.1, 8.7], // Frankfurt
  'eu-north-1': [59.3, 18.1], // Stockholm
  // Asia Pacific
  'asia-east1': [25.0, 121.5], // Taiwan
  'asia-northeast1': [35.6, 139.7], // Tokyo
  'asia-northeast2': [34.7, 135.5], // Osaka
  'asia-northeast3': [37.5, 127.0], // Seoul
  'asia-south1': [19.0, 72.8], // Mumbai
  'asia-south2': [28.6, 77.2], // Delhi
  'asia-southeast1': [1.3, 103.8], // Singapore
  'asia-southeast2': [-6.2, 106.8], // Jakarta
  'australia-southeast1': [-33.9, 151.2], // Sydney
  'australia-southeast2': [-37.8, 145.0], // Melbourne
  'ap-northeast-1': [35.6, 139.7], // Tokyo
  'ap-northeast-2': [37.5, 127.0], // Seoul
  'ap-south-1': [19.0, 72.8], // Mumbai
  'ap-southeast-1': [1.3, 103.8], // Singapore
  'ap-southeast-2': [-33.9, 151.2], // Sydney
  // Africa
  'africa-south1': [-33.9, 18.4], // Johannesburg
  'me-west1': [32.1, 34.8], // Tel Aviv
};

/**
 * Get [lat, lng] for a region code, or null if unknown.
 * Handles zone suffixes (e.g. us-east1-b -> us-east1).
 */
export function getRegionCoordinates(regionCode: string): [number, number] | null {
  const normalized = regionCode.toLowerCase().replace(/-[a-z]$/, ''); // strip zone suffix
  return REGION_COORDINATES[normalized] ?? REGION_COORDINATES[regionCode.toLowerCase()] ?? null;
}
