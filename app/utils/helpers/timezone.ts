/**
 * Timezone-aware conversion utilities for Prometheus API requests
 *
 * Handles conversion between user's timezone and UTC for accurate time range queries.
 */
import { endOfDay, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

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

/**
 * Convert a date to start of day in specified timezone, then to UTC timestamp (seconds)
 *
 * @param date - The date to convert
 * @param timezone - The timezone to interpret the date in (e.g., 'America/New_York')
 * @returns Unix timestamp in seconds (UTC)
 *
 * @example
 * // User in PST selects "Oct 9, 2025"
 * toUTCTimestampStartOfDay(new Date('2025-10-09'), 'America/Los_Angeles')
 * // Returns: 1728446400 (Oct 9, 2025 00:00:00 PST = Oct 9, 2025 07:00:00 UTC)
 */
export function toUTCTimestampStartOfDay(date: Date, timezone: string): number {
  // Get the date in the user's timezone
  const zonedDate = toZonedTime(date, timezone);

  // Apply start of day in that timezone
  const startOfDayInTz = startOfDay(zonedDate);

  // Convert back to UTC
  const utcDate = fromZonedTime(startOfDayInTz, timezone);

  // Return Unix timestamp in seconds
  return Math.floor(utcDate.getTime() / 1000);
}

/**
 * Convert a date to end of day in specified timezone, then to UTC timestamp (seconds)
 *
 * @param date - The date to convert
 * @param timezone - The timezone to interpret the date in (e.g., 'America/New_York')
 * @returns Unix timestamp in seconds (UTC)
 *
 * @example
 * // User in PST selects "Oct 9, 2025"
 * toUTCTimestampEndOfDay(new Date('2025-10-09'), 'America/Los_Angeles')
 * // Returns: 1728532799 (Oct 9, 2025 23:59:59 PST = Oct 10, 2025 06:59:59 UTC)
 */
export function toUTCTimestampEndOfDay(date: Date, timezone: string): number {
  // Get the date in the user's timezone
  const zonedDate = toZonedTime(date, timezone);

  // Apply end of day in that timezone
  const endOfDayInTz = endOfDay(zonedDate);

  // Convert back to UTC
  const utcDate = fromZonedTime(endOfDayInTz, timezone);

  // Return Unix timestamp in seconds
  return Math.floor(utcDate.getTime() / 1000);
}

/**
 * Convert a Date object to UTC timestamp (seconds) without timezone interpretation
 * Used when the Date object is already in UTC or timezone conversion has been done
 *
 * @param date - The date to convert
 * @returns Unix timestamp in seconds
 */
export function toUTCTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Create timezone-aware time range as UTC timestamps
 * Applies start/end of day in user's timezone, then converts to UTC
 *
 * @param from - Start date
 * @param to - End date
 * @param timezone - User's timezone preference
 * @returns Object with start and end Unix timestamps (seconds, UTC)
 *
 * @example
 * // User in EST selects Oct 6-9, 2025
 * createTimezoneAwareRange(
 *   new Date('2025-10-06'),
 *   new Date('2025-10-09'),
 *   'America/New_York'
 * )
 * // Returns: { start: 1728187200, end: 1728529199 }
 * // (Oct 6 00:00 EST → Oct 9 23:59 EST, converted to UTC)
 */
export function createTimezoneAwareRange(
  from: Date,
  to: Date,
  timezone: string
): { start: number; end: number } {
  return {
    start: toUTCTimestampStartOfDay(from, timezone),
    end: toUTCTimestampEndOfDay(to, timezone),
  };
}

/**
 * Convert UTC timestamp back to Date object
 * Useful for displaying timestamps received from API
 *
 * @param timestamp - Unix timestamp in seconds
 * @returns Date object
 */
export function fromUTCTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
