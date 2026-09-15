import { axiosRequestPath, gateAxiosRequest, rateLimitErrorFromAxios } from './axios-gate';
import { notePaused, pausedFor, resetRateLimitGate } from './gate';
import { RateLimitError } from '@/utils/errors/app-error';
import { beforeEach, describe, expect, test } from 'bun:test';

beforeEach(() => resetRateLimitGate());

describe('axiosRequestPath', () => {
  test('joins baseURL and url, and keeps absolute URLs', () => {
    expect(axiosRequestPath({ baseURL: '/api/proxy', url: '/apis/x' })).toBe('/api/proxy/apis/x');
    expect(axiosRequestPath({ baseURL: '/api/proxy/', url: 'apis/x' })).toBe('/api/proxy/apis/x');
    expect(axiosRequestPath({ url: 'https://h.test/api/usage?x=1' })).toBe('/api/usage');
    expect(axiosRequestPath({})).toBe('');
  });
});

describe('gateAxiosRequest', () => {
  test('returns the config untouched when not paused, throws while paused', () => {
    const config = { baseURL: '/api/proxy', url: '/apis/o11y.miloapis.com/v1alpha1/logs' };
    expect(gateAxiosRequest(config)).toBe(config);
    notePaused('machine', 30);
    expect(() => gateAxiosRequest(config)).toThrow(RateLimitError);
    expect(gateAxiosRequest({ baseURL: '/api/proxy', url: '/apis/other' })).toBeDefined();
  });
});

describe('rateLimitErrorFromAxios', () => {
  test('builds a RateLimitError from a 429 and records the pause', () => {
    const err = rateLimitErrorFromAxios(
      {
        response: {
          status: 429,
          headers: { 'retry-after': '15', 'x-ratelimit-class': 'interactive' },
        },
      },
      'req-9'
    );
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err?.retryAfter).toBe(15);
    expect(err?.requestId).toBe('req-9');
    expect(pausedFor('/api/proxy/apis/x')).toBeGreaterThan(10);
  });

  test('returns null for anything else', () => {
    expect(rateLimitErrorFromAxios({ response: { status: 500 } })).toBeNull();
    expect(rateLimitErrorFromAxios({})).toBeNull();
  });
});
