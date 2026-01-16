// app/modules/datum-ui/components/time-range-picker/presets.ts
import type { PresetConfig, DateRange } from './types';
import { subHours, subDays, subMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Get start of day in a specific timezone
 */
function startOfDayInTimezone(date: Date, timezone: string): Date {
  // Convert to timezone, set to start of day, convert back
  const zonedDate = toZonedTime(date, timezone);
  zonedDate.setHours(0, 0, 0, 0);
  return fromZonedTime(zonedDate, timezone);
}

/**
 * Get end of day in a specific timezone
 */
function endOfDayInTimezone(date: Date, timezone: string): Date {
  // Convert to timezone, set to end of day, convert back
  const zonedDate = toZonedTime(date, timezone);
  zonedDate.setHours(23, 59, 59, 999);
  return fromZonedTime(zonedDate, timezone);
}

/**
 * Default time range presets with timezone-aware range calculation
 * Note: All presets use "now" as end time to avoid future timestamps
 * (API rejects future times for historical audit logs)
 *
 * API constraint: Maximum time range is 720 hours (30 days)
 */
export const DEFAULT_PRESETS: PresetConfig[] = [
  {
    key: '15m',
    label: 'Last 15 minutes',
    shortcut: '1',
    getRange: (_timezone: string): DateRange => {
      const now = new Date();
      return {
        from: subMinutes(now, 15),
        to: now,
      };
    },
  },
  {
    key: '30m',
    label: 'Last 30 minutes',
    shortcut: '3',
    getRange: (_timezone: string): DateRange => {
      const now = new Date();
      return {
        from: subMinutes(now, 30),
        to: now,
      };
    },
  },
  {
    key: '1h',
    label: 'Last hour',
    shortcut: 'H',
    getRange: (_timezone: string): DateRange => {
      const now = new Date();
      return {
        from: subHours(now, 1),
        to: now,
      };
    },
  },
  {
    key: 'today',
    label: 'Today',
    shortcut: 'D',
    getRange: (timezone: string): DateRange => {
      const now = new Date();
      return {
        from: startOfDayInTimezone(now, timezone),
        to: now, // Use now, not end of day (which would be in the future)
      };
    },
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    shortcut: 'Y',
    getRange: (timezone: string): DateRange => {
      const yesterday = subDays(new Date(), 1);
      return {
        from: startOfDayInTimezone(yesterday, timezone),
        to: endOfDayInTimezone(yesterday, timezone), // Yesterday's end is always in the past
      };
    },
  },
  {
    key: '7d',
    label: 'Last 7 days',
    shortcut: 'W',
    getRange: (_timezone: string): DateRange => {
      const now = new Date();
      return {
        from: subDays(now, 7), // Exactly 7 days ago (168 hours)
        to: now,
      };
    },
  },
  {
    key: '30d',
    label: 'Last 30 days',
    shortcut: 'M',
    getRange: (_timezone: string): DateRange => {
      const now = new Date();
      // Use exactly 30 days (720 hours) to stay within API limit
      return {
        from: subDays(now, 30),
        to: now,
      };
    },
  },
];

/**
 * Get a preset by key
 */
export function getPresetByKey(
  key: string,
  presets: PresetConfig[] = DEFAULT_PRESETS
): PresetConfig | undefined {
  return presets.find((p) => p.key === key);
}

/**
 * Get a preset by keyboard shortcut
 */
export function getPresetByShortcut(
  shortcut: string,
  presets: PresetConfig[] = DEFAULT_PRESETS
): PresetConfig | undefined {
  return presets.find((p) => p.shortcut.toLowerCase() === shortcut.toLowerCase());
}

/**
 * Get the default preset (last 7 days)
 */
export function getDefaultPreset(presets: PresetConfig[] = DEFAULT_PRESETS): PresetConfig {
  return presets.find((p) => p.key === '7d') ?? presets[0];
}

/**
 * Calculate preset range and return UTC ISO strings
 */
export function getPresetRange(
  preset: PresetConfig,
  timezone: string
): { from: string; to: string } {
  const range = preset.getRange(timezone);
  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };
}
