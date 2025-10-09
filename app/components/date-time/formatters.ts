import type { FormatterOptions } from './types';
import { format as dateFormat, formatDistanceToNowStrict } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { enUS } from 'date-fns/locale/en-US';

export const DEFAULT_DATE_FORMAT = 'MMMM d, yyyy hh:mmaaa';

/**
 * Parses a date string or Date object into a valid Date
 */
export function parseDate(date: string | Date): Date | null {
  const parsedDate = date instanceof Date ? date : new Date(date);

  if (!date || isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

/**
 * Formats an absolute date with timezone support
 */
export function formatAbsoluteDate(date: Date, options: FormatterOptions): string {
  const formatString = options.format || DEFAULT_DATE_FORMAT;

  if (options.disableTimezone) {
    return dateFormat(date, formatString, { locale: enUS });
  }

  return formatInTimeZone(date, options.timezone, formatString, { locale: enUS });
}

/**
 * Formats a relative date ("X ago")
 * Note: Relative time is always absolute (timezone-independent) because
 * "2 hours ago" represents a duration, not a point in time.
 * It should be the same regardless of which timezone the user prefers.
 */
export function formatRelativeDate(date: Date, options: FormatterOptions): string {
  // Always use the original UTC date for relative calculations
  // Timezone conversion would create incorrect offsets when comparing to browser's "now"
  return formatDistanceToNowStrict(date, {
    addSuffix: options.addSuffix ?? true,
  });
}

/**
 * Gets the timezone abbreviation (e.g., "PST", "EST")
 */
export function getTimezoneAbbreviation(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'zzz', { locale: enUS });
}

/**
 * Formats a combined display (absolute + relative)
 */
export function formatCombinedDate(
  date: Date,
  options: FormatterOptions,
  separator: string = ' '
): string {
  const absolute = formatAbsoluteDate(date, options);
  const relative = formatRelativeDate(date, options);

  return `${absolute}${separator}(${relative})`;
}
