/**
 * URL parsers for metrics module - Custom nuqs parsers for different metric types
 */
import { parseAsString, parseAsArrayOf, parseAsInteger } from 'nuqs';

/**
 * Parser factory for different filter types
 */
export const createMetricsParser = (
  type: 'string' | 'array' | 'date' | 'dateRange' | 'number',
  defaultValue?: any
) => {
  switch (type) {
    case 'string':
      return parseAsString.withDefault(defaultValue || '');
    case 'array':
      return parseAsArrayOf(parseAsString).withDefault(defaultValue || []);
    case 'number':
      return parseAsInteger.withDefault(defaultValue || 0);
    case 'date':
      // Use string parser and handle date conversion manually to avoid null issues
      return parseAsString.withDefault(defaultValue || '');
    case 'dateRange':
      // For date ranges, we'll serialize as JSON string
      return parseAsString.withDefault(defaultValue || '');
    default:
      return parseAsString.withDefault('');
  }
};

/**
 * Helper to serialize/deserialize date ranges
 */
export const serializeDateRange = (value: { from?: Date; to?: Date } | null): string => {
  if (!value || (!value.from && !value.to)) return '';
  return JSON.stringify({
    from: value.from?.toISOString() || null,
    to: value.to?.toISOString() || null,
  });
};

export const deserializeDateRange = (value: string): { from?: Date; to?: Date } | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return {
      from: parsed.from ? new Date(parsed.from) : undefined,
      to: parsed.to ? new Date(parsed.to) : undefined,
    };
  } catch {
    return null;
  }
};
