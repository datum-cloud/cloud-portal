/**
 * Timezone-aware conversion utilities for date filters
 *
 * Handles conversion between user's timezone and UTC for accurate time range queries.
 */
import { endOfDay, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

/**
 * Convert a date to start of day in specified timezone, then to UTC timestamp (seconds)
 *
 * @param date - The date to convert
 * @param timezone - The timezone to interpret the date in (e.g., 'America/New_York')
 * @returns Unix timestamp in seconds (UTC)
 */
export function toUTCTimestampStartOfDay(date: Date, timezone: string): number {
  const zonedDate = toZonedTime(date, timezone);
  const startOfDayInTz = startOfDay(zonedDate);
  const utcDate = fromZonedTime(startOfDayInTz, timezone);
  return Math.floor(utcDate.getTime() / 1000);
}

/**
 * Convert a date to end of day in specified timezone, then to UTC timestamp (seconds)
 *
 * @param date - The date to convert
 * @param timezone - The timezone to interpret the date in (e.g., 'America/New_York')
 * @returns Unix timestamp in seconds (UTC)
 */
export function toUTCTimestampEndOfDay(date: Date, timezone: string): number {
  const zonedDate = toZonedTime(date, timezone);
  const endOfDayInTz = endOfDay(zonedDate);
  const utcDate = fromZonedTime(endOfDayInTz, timezone);
  return Math.floor(utcDate.getTime() / 1000);
}
