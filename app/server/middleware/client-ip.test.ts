import {
  DEFAULT_TRUSTED_PROXY_HOPS,
  getClientIP,
  resolveTrustedProxyHops,
  trustedForwardedAddress,
} from './client-ip';
import { Hono } from 'hono';
import { describe, expect, test } from 'vitest';

describe('resolveTrustedProxyHops', () => {
  test('defaults to the single Envoy hop and accepts non-negative integers', () => {
    expect(DEFAULT_TRUSTED_PROXY_HOPS).toBe(1);
    expect(resolveTrustedProxyHops({})).toBe(1);
    expect(resolveTrustedProxyHops({ TRUSTED_PROXY_HOPS: '2' })).toBe(2);
    expect(resolveTrustedProxyHops({ TRUSTED_PROXY_HOPS: '0' })).toBe(0);
  });

  test('ignores values that are not a hop count', () => {
    for (const value of ['', ' ', '-1', '1.5', 'two']) {
      expect(resolveTrustedProxyHops({ TRUSTED_PROXY_HOPS: value })).toBe(1);
    }
  });
});

describe('trustedForwardedAddress', () => {
  test('takes the entry the trusted proxy appended, never the client-supplied prefix', () => {
    expect(trustedForwardedAddress('6.6.6.6, 203.0.113.7', 1)).toBe('203.0.113.7');
    expect(trustedForwardedAddress('203.0.113.7', 1)).toBe('203.0.113.7');
    expect(trustedForwardedAddress('6.6.6.6, 203.0.113.7, 10.0.0.5', 2)).toBe('203.0.113.7');
    expect(trustedForwardedAddress('6.6.6.6,2001:db8::1', 1)).toBe('2001:db8::1');
  });

  test('is undefined when the chain is too short, disabled, or not an IP', () => {
    expect(trustedForwardedAddress(undefined, 1)).toBeUndefined();
    expect(trustedForwardedAddress('203.0.113.7', 2)).toBeUndefined();
    expect(trustedForwardedAddress('203.0.113.7', 0)).toBeUndefined();
    expect(trustedForwardedAddress('203.0.113.7, not-an-ip', 1)).toBeUndefined();
    expect(trustedForwardedAddress('203.0.113.7, 999.1.1.1', 1)).toBeUndefined();
  });
});

describe('getClientIP', () => {
  const app = new Hono();
  app.get('/ip', (c) => c.text(getClientIP(c, 1) ?? 'none'));

  test('ignores CF-Connecting-IP and X-Real-IP, which nothing in front of the portal sets', async () => {
    const res = await app.request('/ip', {
      headers: {
        'CF-Connecting-IP': '6.6.6.6',
        'X-Real-IP': '6.6.6.7',
        'X-Forwarded-For': '6.6.6.8, 203.0.113.7',
      },
    });
    expect(await res.text()).toBe('203.0.113.7');
  });

  test('falls back to the socket, which app.request does not have', async () => {
    expect(await (await app.request('/ip')).text()).toBe('none');
  });
});
