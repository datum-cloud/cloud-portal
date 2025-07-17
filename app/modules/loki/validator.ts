/**
 * Query parameter validation utilities
 */
import type { QueryParams, ValidatedQueryParams } from './types';

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
    level: params.level || undefined,
  };
}

/**
 * Validates time parameters with support for multiple formats
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

  // Handle relative time formats (1h, 30m, 24h, 7d)
  if (/^\d+[smhd]$/.test(trimmed)) {
    return trimmed;
  }

  // Handle ISO 8601/RFC3339 dates (check before Unix timestamp)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000).toString();
      }
    } catch {
      // Fall through to default
    }
  }

  // Handle Unix timestamps (purely numeric strings)
  if (/^\d+$/.test(trimmed)) {
    const timestamp = parseInt(trimmed, 10);
    if (!isNaN(timestamp) && timestamp > 0) {
      return trimmed;
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
