/**
 * Date serialization utilities for DataTable filters
 * Handles conversion between Date objects and URL-safe string formats
 */

/**
 * Serializes a date range to a compact timestamp format
 * Format: timestamp_timestamp (e.g., "1728172800_1728345599")
 *
 * @param value - Date range object with optional from and to dates
 * @returns URL-safe string representation of the date range
 */
export function serializeDateRange(value: { from?: Date; to?: Date } | null): string {
  if (!value || (!value.from && !value.to)) return '';

  // Convert dates to Unix timestamps (seconds)
  const startTs = value.from ? Math.floor(value.from.getTime() / 1000) : '';
  const endTs = value.to ? Math.floor(value.to.getTime() / 1000) : '';

  // If both timestamps exist, use compact format
  if (startTs && endTs) {
    return `${startTs}_${endTs}`;
  }

  // If only one exists, still use underscore format
  return `${startTs}_${endTs}`;
}

/**
 * Deserializes a date range from URL string format to Date objects
 * Supports both compact timestamp format and JSON format (backward compatibility)
 *
 * @param value - URL string in timestamp_timestamp or JSON format
 * @returns Date range object with from and to dates, or null if invalid
 */
export function deserializeDateRange(value: string): { from?: Date; to?: Date } | null {
  if (!value) return null;

  // Try compact timestamp format (number_number)
  if (/^\d*_\d*$/.test(value)) {
    const [startStr, endStr] = value.split('_');
    return {
      from: startStr ? new Date(parseInt(startStr, 10) * 1000) : undefined,
      to: endStr ? new Date(parseInt(endStr, 10) * 1000) : undefined,
    };
  }

  // Backward compatibility: try JSON format
  try {
    const parsed = JSON.parse(value);
    return {
      from: parsed.from ? new Date(parsed.from) : undefined,
      to: parsed.to ? new Date(parsed.to) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Serializes a single date to ISO string format
 *
 * @param value - Date object
 * @returns ISO string representation or empty string if invalid
 */
export function serializeDate(value: Date | null): string {
  if (!value || !(value instanceof Date) || isNaN(value.getTime())) {
    return '';
  }
  return value.toISOString();
}

/**
 * Deserializes a single date from ISO string format
 *
 * @param value - ISO date string
 * @returns Date object or null if invalid
 */
export function deserializeDate(value: string): Date | null {
  if (!value || value === '' || value === 'null') {
    return null;
  }

  try {
    const date = new Date(value);
    return !isNaN(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Checks if a string matches the timestamp_timestamp date range format
 *
 * @param value - String to check
 * @returns true if the string is in timestamp_timestamp format
 */
export function isDateRangeFormat(value: string): boolean {
  return /^\d+_\d+$/.test(value);
}
