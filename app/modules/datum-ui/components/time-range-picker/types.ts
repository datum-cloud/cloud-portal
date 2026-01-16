// app/modules/datum-ui/components/time-range-picker/types.ts

/**
 * Time range value - stores UTC timestamps
 * All from/to values are ISO 8601 UTC strings (e.g., '2024-01-15T04:00:00Z')
 */
export interface TimeRangeValue {
  /** Type of range selection */
  type: 'preset' | 'custom';

  /** For preset type: the preset key (e.g., 'today', '24h', '7d') */
  preset?: string;

  /** Start time in UTC ISO format (e.g., '2024-01-15T04:00:00Z') */
  from: string;

  /** End time in UTC ISO format (e.g., '2024-01-15T08:00:00Z') */
  to: string;
}

/**
 * Date range for internal use (actual Date objects)
 */
export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Preset configuration with dynamic range calculation
 */
export interface PresetConfig {
  /** Unique key for the preset */
  key: string;
  /** Display label (e.g., 'Last 24 hours') */
  label: string;
  /** Keyboard shortcut (e.g., 'D' for Today) */
  shortcut: string;
  /**
   * Function to calculate the date range based on user's timezone
   * Returns dates that will be converted to UTC for storage/API
   */
  getRange: (timezone: string) => DateRange;
}

/**
 * Timezone option for selector
 */
export interface TimezoneOption {
  /** Timezone identifier (e.g., 'Asia/Jakarta') */
  value: string;
  /** Display label (e.g., 'Asia/Jakarta (UTC+07:00)') */
  label: string;
  /** UTC offset string (e.g., '+07:00') */
  offset: string;
}

/**
 * API time range format (what gets sent to the API)
 * Always in UTC ISO format
 */
export interface ApiTimeRange {
  /** Start time in UTC (e.g., '2024-01-15T04:00:00Z') */
  startTime: string;
  /** End time in UTC (e.g., '2024-01-16T08:00:00Z') */
  endTime: string;
}
