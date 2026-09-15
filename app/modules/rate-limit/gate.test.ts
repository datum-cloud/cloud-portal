import {
  bucketFromHeader,
  notePaused,
  parseRetryAfter,
  pausedFor,
  resetRateLimitGate,
} from './gate';
import { beforeEach, describe, expect, test } from 'bun:test';

beforeEach(() => resetRateLimitGate());

describe('gate', () => {
  test('a paused class rejects its own paths and nothing else', () => {
    notePaused('machine', 30, 0);
    expect(pausedFor('/api/watch/subscribe', 0)).toBe(30);
    expect(pausedFor('/api/proxy/apis/x', 0)).toBe(0);
  });

  test('ceiling and penalty pause every path, longest wins', () => {
    notePaused('machine', 10, 0);
    notePaused('ceiling', 20, 0);
    expect(pausedFor('/api/watch/subscribe', 0)).toBe(20);
    expect(pausedFor('/api/proxy/apis/x', 0)).toBe(20);
    notePaused('penalty', 900, 0);
    expect(pausedFor('/api/usage', 0)).toBe(900);
  });

  test('pauses expire and round up to whole seconds', () => {
    notePaused('interactive', 5, 0);
    expect(pausedFor('/api/usage', 4_500)).toBe(1);
    expect(pausedFor('/api/usage', 5_000)).toBe(0);
  });

  test('header parsing is defensive', () => {
    expect(parseRetryAfter('42')).toBe(42);
    expect(parseRetryAfter(null)).toBe(60);
    expect(parseRetryAfter('nope', 7)).toBe(7);
    expect(bucketFromHeader('machine')).toBe('machine');
    expect(bucketFromHeader('penalty')).toBe('penalty');
    expect(bucketFromHeader(null)).toBe('interactive');
    expect(bucketFromHeader('weird')).toBe('interactive');
  });
});
