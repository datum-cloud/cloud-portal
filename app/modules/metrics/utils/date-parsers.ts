/**
 * Time utility functions shared across the Metrics module
 */
import type { TimeRange } from '@/modules/prometheus';
import { endOfDay, startOfDay, subDays, subHours, subMinutes } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

/**
 * Parse a Prometheus-like duration (e.g., 5s, 10m, 3h, 7d, 1w) into milliseconds.
 */
export function parseDurationToMs(durationStr: string): number | null {
  const match = durationStr.match(/^(\d+)([smhdw])$/);
  if (!match) return null;
  const value = parseInt(match[1] as string, 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd' | 'w';
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

/**
 * Serialize a TimeRange to Unix timestamp format (seconds).
 * Format: `<start_timestamp>_<end_timestamp>`
 * Example: `1704067200_1706745599`
 */
export function serializeTimeRange(timeRange: TimeRange): string {
  const startSeconds = Math.floor(timeRange.start.getTime() / 1000);
  const endSeconds = Math.floor(timeRange.end.getTime() / 1000);
  return `${startSeconds}_${endSeconds}`;
}

/**
 * Validate if a string is a valid timestamp range format.
 * Format: `<number>_<number>` where end > start
 */
export function isValidTimestampRange(rangeStr: string): boolean {
  const match = rangeStr.match(/^(\d+)_(\d+)$/);
  if (!match) return false;

  const start = parseInt(match[1] as string, 10);
  const end = parseInt(match[2] as string, 10);

  // Validate: end must be after start
  if (end <= start) return false;

  // Validate: reasonable time range (not before 2020, not too far in future)
  const minTimestamp = 1577836800; // 2020-01-01
  const maxTimestamp = Math.floor(Date.now() / 1000) + 31536000; // +1 year from now

  return start >= minTimestamp && end <= maxTimestamp;
}

/**
 * Parse a time range string which can be either:
 * - Relative: `now-<duration>` e.g., `now-6h`, `now-24h`, `now-7d`
 * - Absolute: `<timestamp>_<timestamp>` e.g., `1704067200_1706745599`
 */
export function parseRange(rangeStr: string): TimeRange {
  // Try timestamp format (numeric_numeric)
  if (/^\d+_\d+$/.test(rangeStr)) {
    const [startStr, endStr] = rangeStr.split('_');
    const startSeconds = parseInt(startStr as string, 10);
    const endSeconds = parseInt(endStr as string, 10);

    // Convert Unix timestamps (seconds) to milliseconds
    const start = new Date(startSeconds * 1000);
    const end = new Date(endSeconds * 1000);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { start, end } satisfies TimeRange;
    }
  }

  // Try relative format (now-<duration>)
  if (rangeStr.startsWith('now-')) {
    const durationStr = rangeStr.substring(4);
    const durationMs = parseDurationToMs(durationStr);
    if (durationMs) {
      const end = new Date();
      const start = new Date(end.getTime() - durationMs);
      return { start, end } satisfies TimeRange;
    }
  }

  // Fallback: default to last 6 hours
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
  return { start, end } satisfies TimeRange;
}

/**
 * Convert a preset value (e.g., 'now-1h', 'now-30m') to a date range for display purposes.
 * Returns an object with from and to Date objects.
 *
 * Smart Day Boundaries:
 * - Ranges >= 24h use day boundaries (00:00:00 to 23:59:59) in user's timezone
 * - Ranges < 24h use exact time for real-time monitoring
 *
 * @param presetValue - Preset value like 'now-24h', 'now-7d'
 * @param timezone - User's timezone preference (optional, for day boundary calculation)
 */
export function getPresetDateRange(
  presetValue: string,
  timezone?: string
): { from: Date; to: Date } {
  const now = new Date();
  const value = presetValue.replace('now-', '');
  let start: Date;

  // Determine if we should use day boundaries (for ranges >= 24 hours)
  const useDayBoundaries =
    value.endsWith('d') || (value.endsWith('h') && parseInt(value.replace('h', '')) >= 24);

  if (value.endsWith('m')) {
    const minutes = parseInt(value.replace('m', ''));
    start = subMinutes(now, minutes);
  } else if (value.endsWith('h')) {
    const hours = parseInt(value.replace('h', ''));
    if (useDayBoundaries && timezone) {
      // For 24h+, use full days from start of the day in user's timezone
      const daysAgo = Math.floor(hours / 24);
      const nowInTz = toZonedTime(now, timezone);
      const startInTz = startOfDay(subDays(nowInTz, daysAgo));
      const endInTz = endOfDay(nowInTz);

      // Convert back to UTC
      return {
        from: fromZonedTime(startInTz, timezone),
        to: fromZonedTime(endInTz, timezone),
      };
    } else if (useDayBoundaries) {
      // Fallback without timezone (use local timezone)
      const daysAgo = Math.floor(hours / 24);
      start = startOfDay(subDays(now, daysAgo));
      const end = endOfDay(now);
      return { from: start, to: end };
    } else {
      // For <24h, use exact time for real-time monitoring
      start = subHours(now, hours);
    }
  } else if (value.endsWith('d')) {
    const days = parseInt(value.replace('d', ''));
    if (timezone) {
      // Use user's timezone for day boundaries
      const nowInTz = toZonedTime(now, timezone);
      const startInTz = startOfDay(subDays(nowInTz, days));
      const endInTz = endOfDay(nowInTz);

      return {
        from: fromZonedTime(startInTz, timezone),
        to: fromZonedTime(endInTz, timezone),
      };
    } else {
      // Fallback without timezone
      start = startOfDay(subDays(now, days));
      const end = endOfDay(now);
      return { from: start, to: end };
    }
  } else {
    start = subHours(now, 1); // fallback
  }

  return { from: start, to: now };
}
