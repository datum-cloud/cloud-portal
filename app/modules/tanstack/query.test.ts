import { shouldRetryQuery } from './query';
import { AppError } from '@/utils/errors/app-error';
import { describe, expect, test } from 'bun:test';

const appError = (status: number) =>
  new AppError('request failed', {
    code: 'API_ERROR',
    status,
    captureToSentry: false,
  });

describe('shouldRetryQuery', () => {
  test('never retries expected user-facing statuses', () => {
    for (const status of [401, 403, 404, 429]) {
      expect(shouldRetryQuery(0, appError(status))).toBe(false);
      expect(shouldRetryQuery(1, appError(status))).toBe(false);
    }
  });

  test('retries a 500 exactly once', () => {
    expect(shouldRetryQuery(0, appError(500))).toBe(true);
    expect(shouldRetryQuery(1, appError(500))).toBe(false);
  });

  test('retries errors without a status exactly once', () => {
    expect(shouldRetryQuery(0, new Error('network down'))).toBe(true);
    expect(shouldRetryQuery(1, new Error('network down'))).toBe(false);
  });

  test('handles null and undefined errors without throwing', () => {
    expect(shouldRetryQuery(0, null)).toBe(true);
    expect(shouldRetryQuery(0, undefined)).toBe(true);
    expect(shouldRetryQuery(1, null)).toBe(false);
  });
});
