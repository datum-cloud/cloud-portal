/**
 * Validates Help Scout Beacon ID format
 * @param beaconId - Beacon ID to validate
 * @returns boolean indicating if the Beacon ID is valid
 */
export function isValidBeaconId(beaconId: string): boolean {
  // Help Scout Beacon IDs can be:
  // 1. 8-character alphanumeric strings (e.g., "abcd1234")
  // 2. UUID format (e.g., "57a7245e-772c-4d51-bdb1-6b898f34f3cb")

  // Check for 8-character alphanumeric format
  const shortFormat = /^[a-zA-Z0-9]{8}$/.test(beaconId);

  // Check for UUID format (with or without hyphens)
  const uuidFormat = /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/i.test(
    beaconId
  );

  return shortFormat || uuidFormat;
}

/**
 * Sanitizes user data for Help Scout
 * @param user - Raw user data
 * @returns Sanitized user data safe for Help Scout
 */
export function sanitizeUserData(
  user: Record<string, any>
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(user)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else {
        sanitized[key] = String(value);
      }
    }
  }

  return sanitized;
}

/**
 * Gets the Help Scout script URL
 * @returns Script URL for the Beacon (no Beacon ID needed in URL)
 */
export function getHelpScoutScriptUrl(): string {
  return 'https://beacon-v2.helpscout.net';
}

/**
 * Checks if Help Scout Beacon is loaded
 * @returns boolean indicating if Beacon is available
 */
export function isHelpScoutLoaded(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.Beacon === 'function' &&
    window.BeaconLoaded === true
  );
}
