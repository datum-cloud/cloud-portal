import { RateLimitError } from './app-error';
import { parseRetryAfterHeader } from './axios';
import { describe, expect, test } from 'bun:test';

describe('RateLimitError', () => {
  test('message names the retry window when known', () => {
    expect(new RateLimitError(30).message).toBe('Too many requests, try again in 30 seconds');
    expect(new RateLimitError().message).toBe('Too many requests');
    expect(new RateLimitError(30).status).toBe(429);
  });
});

describe('parseRetryAfterHeader', () => {
  test('accepts numeric seconds and rejects anything else', () => {
    expect(parseRetryAfterHeader('45')).toBe(45);
    expect(parseRetryAfterHeader(45)).toBe(45);
    expect(parseRetryAfterHeader('Wed, 21 Oct 2026 07:28:00 GMT')).toBeUndefined();
    expect(parseRetryAfterHeader(undefined)).toBeUndefined();
    expect(parseRetryAfterHeader('0')).toBeUndefined();
  });
});
