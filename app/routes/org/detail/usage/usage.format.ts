import type { MeterUnit } from './usage.mock';

/**
 * Map a UCUM unit string from `MeterDefinition.spec.measurement.unit`
 * onto the three display families this page formats. UCUM is the
 * platform's source of truth for units, so this replaces name-sniffing:
 *   - `By`, `GBy`, `GBy.h`, `kBy` … → bytes
 *   - `s`, `min`, `h`, `d` … → duration (seconds)
 *   - everything else (`{request}`, `{token}`, `1`, …) → count
 */
export function ucumToMeterUnit(unit: string | undefined): MeterUnit {
  if (!unit) return 'count';
  const u = unit.toLowerCase();
  if (u.includes('by')) return 'bytes';
  // Bare time units. Guard against matching the `s` inside other tokens
  // by only treating short, time-like units as durations.
  if (u === 's' || u === 'sec' || u === 'min' || u === 'h' || u === 'd' || u.endsWith('.s')) {
    return 'duration';
  }
  return 'count';
}

/**
 * Format a raw meter value for its unit. Drives both the "used / limit"
 * headline on each card and the cells in the summary table so the two
 * surfaces stay consistent.
 */
export function formatByUnit(unit: MeterUnit, value: number): string {
  switch (unit) {
    case 'bytes':
      return formatBytes(value);
    case 'duration':
      return formatDuration(value);
    default:
      return value.toLocaleString();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(seconds >= 600 ? 0 : 1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(seconds >= 36000 ? 0 : 1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

/**
 * "used / limit" pair formatted for display, e.g. `0 B / 100GB`. When the
 * meter has no matching quota (`limit <= 0`), only the consumed figure is
 * shown so the card doesn't imply a fabricated "/ 0" ceiling.
 */
export function formatUsagePair(unit: MeterUnit, used: number, limit: number): string {
  if (limit <= 0) return formatByUnit(unit, used);
  return `${formatByUnit(unit, used)} / ${formatByUnit(unit, limit)}`;
}
