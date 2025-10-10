/**
 * Utility functions for timezone detection and management
 */

/**
 * Get the user's local timezone from the browser
 * @returns The timezone string (e.g., "America/New_York")
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    // Fallback to UTC if timezone detection fails
    return 'Etc/GMT';
  }
}

/**
 * Check if a timezone string is valid
 * @param timezone - The timezone string to validate
 * @returns True if the timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}
