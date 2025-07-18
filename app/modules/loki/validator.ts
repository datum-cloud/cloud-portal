/**
 * Query parameter validation utilities
 */
import type { QueryParams, ValidatedQueryParams } from './types';
import {
  isValid,
  parseISO,
  getUnixTime,
  subSeconds,
  subMinutes,
  subHours,
  subDays,
  subWeeks,
} from 'date-fns';

const LOKI_CONFIG = {
  defaultLimit: 100,
  maxLimit: 1000,
  defaultTimeRange: '48h',
} as const;

/**
 * Validates and sanitizes query parameters
 */
export function validateQueryParams(params: QueryParams): ValidatedQueryParams {
  const limit = Math.min(
    Math.max(1, parseInt(params.limit || String(LOKI_CONFIG.defaultLimit), 10)),
    LOKI_CONFIG.maxLimit
  );

  const start = validateTimeParam(params.start, LOKI_CONFIG.defaultTimeRange);
  const end = validateTimeParam(params.end, '');

  return {
    limit,
    start,
    end,
  };
}

/**
 * Validates time parameters with support for multiple formats using date-fns
 */
export function validateTimeParam(param: string | undefined, defaultValue: string): string {
  if (!param) {
    return defaultValue;
  }

  const trimmed = param.trim();

  // Handle 'now'
  if (trimmed === 'now') {
    return 'now';
  }

  // Handle relative time formats (1s, 30m, 24h, 7d, 2w) using date-fns
  const relativeMatch = trimmed.match(/^(\d+)([smhdw])$/);
  if (relativeMatch) {
    const [, amount, unit] = relativeMatch;
    const value = parseInt(amount, 10);
    const now = new Date();

    let targetDate: Date;

    try {
      switch (unit) {
        case 's':
          targetDate = subSeconds(now, value);
          break;
        case 'm':
          targetDate = subMinutes(now, value);
          break;
        case 'h':
          targetDate = subHours(now, value);
          break;
        case 'd':
          targetDate = subDays(now, value);
          break;
        case 'w':
          targetDate = subWeeks(now, value);
          break;
        default:
          throw new Error(`Unsupported time unit: ${unit}`);
      }

      if (isValid(targetDate)) {
        return getUnixTime(targetDate).toString();
      }
    } catch (error) {
      console.warn(`Error processing relative time ${trimmed}:`, error);
    }
  }

  // Handle ISO 8601/RFC3339 dates using date-fns
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    try {
      const date = parseISO(trimmed);
      if (isValid(date)) {
        return getUnixTime(date).toString();
      }
    } catch (error) {
      console.warn(`Error parsing ISO date ${trimmed}:`, error);
    }
  }

  // Handle various date formats using date-fns
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    try {
      const date = parseISO(`${trimmed}T00:00:00Z`);
      if (isValid(date)) {
        return getUnixTime(date).toString();
      }
    } catch (error) {
      console.warn(`Error parsing date ${trimmed}:`, error);
    }
  }

  // Handle Unix timestamps (purely numeric strings)
  if (/^\d+$/.test(trimmed)) {
    const timestamp = parseInt(trimmed, 10);
    if (!isNaN(timestamp) && timestamp > 0) {
      // Validate that the timestamp is reasonable (not too far in past/future)
      const date = new Date(timestamp * 1000);
      const now = new Date();
      const oneYearAgo = subDays(now, 365);
      const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      if (date >= oneYearAgo && date <= oneYearFromNow) {
        return trimmed;
      } else {
        console.warn(`Unix timestamp ${trimmed} is outside reasonable range`);
      }
    }
  }

  console.warn(`Invalid time parameter: ${param}, using default: ${defaultValue}`);
  return defaultValue;
}

/**
 * Sanitizes search query to prevent injection
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  // Escape special regex characters
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
