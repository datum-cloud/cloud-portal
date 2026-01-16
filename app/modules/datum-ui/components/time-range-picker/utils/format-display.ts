// app/modules/datum-ui/components/time-range-picker/utils/format-display.ts
import type { TimeRangeValue } from '../types';
import { formatUtcForDisplay, utcStringToZonedDate } from './timezone';
import { format, isSameDay, isSameYear } from 'date-fns';

/**
 * Format a TimeRangeValue for display in the trigger button
 * Always shows the actual date/time range, not preset labels
 * Converts UTC timestamps to user's timezone for display
 */
export function formatTimeRangeDisplay(value: TimeRangeValue | null, timezone: string): string {
  if (!value || !value.from || !value.to) {
    return 'Select time range';
  }

  return formatDateRangeDisplay(value.from, value.to, timezone);
}

/**
 * Format a date range for display
 * Smart formatting based on whether dates are same day/year
 */
function formatDateRangeDisplay(fromUtc: string, toUtc: string, timezone: string): string {
  try {
    const fromDate = utcStringToZonedDate(fromUtc, timezone);
    const toDate = utcStringToZonedDate(toUtc, timezone);
    const now = new Date();

    // Same day: "Jan 16, 00:00 - 14:30"
    if (isSameDay(fromDate, toDate)) {
      const dateStr = isSameYear(fromDate, now)
        ? format(fromDate, 'MMM d')
        : format(fromDate, 'MMM d, yyyy');
      const fromTime = format(fromDate, 'HH:mm');
      const toTime = format(toDate, 'HH:mm');
      return `${dateStr}, ${fromTime} - ${toTime}`;
    }

    // Same year as current: "Jan 10, 00:00 - Jan 16, 14:30"
    if (isSameYear(fromDate, now) && isSameYear(toDate, now)) {
      const fromStr = format(fromDate, 'MMM d, HH:mm');
      const toStr = format(toDate, 'MMM d, HH:mm');
      return `${fromStr} - ${toStr}`;
    }

    // Different years: "Dec 17, 2025 - Jan 16, 2026"
    const fromStr = format(fromDate, 'MMM d, yyyy');
    const toStr = format(toDate, 'MMM d, yyyy');
    return `${fromStr} - ${toStr}`;
  } catch {
    // Fallback to simple format
    const fromDisplay = formatUtcForDisplay(fromUtc, timezone, 'MMM d, HH:mm');
    const toDisplay = formatUtcForDisplay(toUtc, timezone, 'MMM d, HH:mm');
    return `${fromDisplay} - ${toDisplay}`;
  }
}

/**
 * Format a UTC ISO string for display in user's timezone
 */
export function formatSingleTimeDisplay(utcString: string, timezone: string): string {
  try {
    return formatUtcForDisplay(utcString, timezone, 'MMM d, yyyy HH:mm');
  } catch {
    return utcString;
  }
}

/**
 * Format a Date object for the datetime-local input field
 */
export function formatDateForInput(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Format UTC string for datetime-local input in user's timezone
 */
export function formatUtcForInput(utcString: string, timezone: string): string {
  try {
    const date = new Date(utcString);
    const { utcToLocalInputString } = require('./timezone');
    return utcToLocalInputString(date, timezone);
  } catch {
    return '';
  }
}
