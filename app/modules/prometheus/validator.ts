/**
 * Zod schemas for Prometheus query validation and sanitization
 */
import { QueryValidationError } from './errors';
import type {
  PrometheusQueryOptions,
  PrometheusInstantQueryParams,
  PrometheusRangeQueryParams,
  TimeRange,
  QueryBuilderOptions,
} from './types';
import { z } from 'zod';

/**
 * Time range validation schema
 * Accepts Date objects, ISO strings, or Unix timestamps
 */
export const timeRangeSchema = z
  .object({
    start: z
      .union([z.date(), z.string().datetime(), z.number().int().positive()])
      .transform((val) => {
        if (val instanceof Date) return val;
        if (typeof val === 'string') return new Date(val);
        return new Date(val * 1000); // Unix timestamp to Date
      }),
    end: z
      .union([z.date(), z.string().datetime(), z.number().int().positive()])
      .transform((val) => {
        if (val instanceof Date) return val;
        if (typeof val === 'string') return new Date(val);
        return new Date(val * 1000); // Unix timestamp to Date
      }),
  })
  .refine((data) => data.start < data.end, {
    message: 'Start time must be before end time',
    path: ['start'],
  });

/**
 * Prometheus query options validation schema
 */
export const prometheusQueryOptionsSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  timeRange: timeRangeSchema.optional(),
  step: z
    .string()
    .regex(/^\d+[smhd]$/, "Invalid step format (e.g., '15s', '1m')")
    .optional(),
  enabled: z.boolean().optional().default(true),
  refetchInterval: z.number().min(1000, 'Refetch interval must be at least 1000ms').optional(),
});

/**
 * Instant query parameters validation schema
 */
export const instantQueryParamsSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  time: z.string().optional(),
});

/**
 * Range query parameters validation schema
 */
export const rangeQueryParamsSchema = z
  .object({
    query: z.string().min(1, 'Query cannot be empty'),
    start: z
      .union([z.string().min(1, 'Start time is required'), z.date(), z.number().int().positive()])
      .transform((val) => {
        if (val instanceof Date) return val;
        if (typeof val === 'string') return new Date(val);
        return new Date(val * 1000); // Unix timestamp to Date
      }),
    end: z
      .union([z.string().min(1, 'End time is required'), z.date(), z.number().int().positive()])
      .transform((val) => {
        if (val instanceof Date) return val;
        if (typeof val === 'string') return new Date(val);
        return new Date(val * 1000); // Unix timestamp to Date
      }),
    step: z.string().regex(/^\d+[smhd]$/, "Invalid step format (e.g., '15s', '1m')"),
  })
  .refine((data) => data.start < data.end, {
    message: 'Start time must be before end time',
    path: ['start'],
  });

/**
 * Query builder options validation schema
 */
export const queryBuilderOptionsSchema = z.object({
  metric: z.string().min(1, 'Metric name is required'),
  filters: z.record(z.string(), z.string()).optional(),
  functions: z.array(z.string()).optional(),
  groupBy: z.array(z.string()).optional(),
  aggregation: z.enum(['sum', 'avg', 'max', 'min', 'count']).optional(),
});

/**
 * Validate Prometheus query options
 */
export function validateQueryOptions(options: unknown): PrometheusQueryOptions {
  try {
    return prometheusQueryOptionsSchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as z.ZodError).issues[0];
      throw new QueryValidationError(
        firstError.message,
        firstError.path.join('.'),
        JSON.stringify(options)
      );
    }
    throw error;
  }
}

/**
 * Validate instant query parameters
 */
export function validateInstantQueryParams(params: unknown): PrometheusInstantQueryParams {
  try {
    return instantQueryParamsSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as z.ZodError).issues[0];
      throw new QueryValidationError(
        firstError.message,
        firstError.path.join('.'),
        JSON.stringify(params)
      );
    }
    throw error;
  }
}

/**
 * Validate range query parameters
 */
export function validateRangeQueryParams(params: unknown): PrometheusRangeQueryParams {
  try {
    return rangeQueryParamsSchema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as z.ZodError).issues[0];
      throw new QueryValidationError(
        firstError.message,
        firstError.path.join('.'),
        JSON.stringify(params)
      );
    }
    throw error;
  }
}

/**
 * Validate query builder options
 */
export function validateQueryBuilderOptions(options: unknown): QueryBuilderOptions {
  try {
    return queryBuilderOptionsSchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as z.ZodError).issues[0];
      throw new QueryValidationError(
        firstError.message,
        firstError.path.join('.'),
        JSON.stringify(options)
      );
    }
    throw error;
  }
}

/**
 * Sanitize PromQL query string
 */
export function sanitizeQuery(query: string): string {
  // Remove potentially dangerous characters and normalize whitespace
  return query
    .trim()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Validate time range
 */
export function validateTimeRange(timeRange: unknown): TimeRange {
  try {
    return timeRangeSchema.parse(timeRange);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = (error as z.ZodError).issues[0];
      throw new QueryValidationError(
        firstError.message,
        firstError.path.join('.'),
        JSON.stringify(timeRange)
      );
    }
    throw error;
  }
}

/**
 * Convert time range to Unix timestamps
 */
export function timeRangeToUnix(timeRange: TimeRange): { start: number; end: number } {
  return {
    start: Math.floor(timeRange.start.getTime() / 1000),
    end: Math.floor(timeRange.end.getTime() / 1000),
  };
}

/**
 * Convert time range to RFC3339 strings
 */
export function timeRangeToRFC3339(timeRange: TimeRange): { start: string; end: string } {
  return {
    start: timeRange.start.toISOString(),
    end: timeRange.end.toISOString(),
  };
}

/**
 * Parse duration string to seconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new QueryValidationError('Invalid duration format', 'duration', duration);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      throw new QueryValidationError('Invalid duration unit', 'duration', duration);
  }
}
