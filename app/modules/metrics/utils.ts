/**
 * Time utility functions shared across the Metrics module
 */
import type { TimeRange } from '@/modules/prometheus';
import { parseISO, subDays, subHours, subMinutes } from 'date-fns';

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
 * Parse a time range string which can be either:
 * - Relative: `now-<duration>` e.g., `now-6h`
 * - Absolute: `<iso>_<iso>` e.g., `2024-01-01T00:00:00.000Z_2024-01-01T12:00:00.000Z`
 */
export function parseRange(rangeStr: string): TimeRange {
  if (rangeStr.includes('_')) {
    const [startStr, endStr] = rangeStr.split('_');
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { start, end } satisfies TimeRange;
    }
  }
  if (rangeStr.startsWith('now-')) {
    const durationStr = rangeStr.substring(4);
    const durationMs = parseDurationToMs(durationStr);
    if (durationMs) {
      const end = new Date();
      const start = new Date(end.getTime() - durationMs);
      return { start, end } satisfies TimeRange;
    }
  }
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
  return { start, end } satisfies TimeRange;
}

/**
 * Convert a preset value (e.g., 'now-1h', 'now-30m') to a date range for display purposes.
 * Returns an object with from and to Date objects.
 */
export function getPresetDateRange(presetValue: string): { from: Date; to: Date } {
  const now = new Date();
  const value = presetValue.replace('now-', '');
  let start: Date;

  if (value.endsWith('m')) {
    const minutes = parseInt(value.replace('m', ''));
    start = subMinutes(now, minutes);
  } else if (value.endsWith('h')) {
    const hours = parseInt(value.replace('h', ''));
    start = subHours(now, hours);
  } else if (value.endsWith('d')) {
    const days = parseInt(value.replace('d', ''));
    start = subDays(now, days);
  } else {
    start = subHours(now, 1); // fallback
  }

  return { from: start, to: now };
}
