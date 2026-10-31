import { errorHandler } from './error-handler';
import { fetchMetadataGuard } from './fetch-metadata';
import type { Variables } from '@/server/types';
import { Hono } from 'hono';
import { describe, expect, test } from 'vitest';

function appWithGuard() {
  const app = new Hono<{ Variables: Variables }>();
  app.onError(errorHandler as never);
  app.use('*', fetchMetadataGuard());
  app.all('/x', (c) => c.json({ ok: true }));
  return app;
}

const request = (method: string, headers: Record<string, string> = {}) =>
  appWithGuard().request('http://portal.test/x', { method, headers });

describe('fetchMetadataGuard', () => {
  test('rejects cross-site and same-site state-changing requests', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect((await request(method, { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403);
      expect((await request(method, { 'Sec-Fetch-Site': 'same-site' })).status).toBe(403);
    }
  });

  test('allows same-origin fetches and user-initiated navigations', async () => {
    expect((await request('DELETE', { 'Sec-Fetch-Site': 'same-origin' })).status).toBe(200);
    expect((await request('POST', { 'Sec-Fetch-Site': 'none' })).status).toBe(200);
  });

  test('never blocks reads, whatever the site', async () => {
    expect((await request('GET', { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(200);
    expect((await request('HEAD', { 'Sec-Fetch-Site': 'cross-site' })).status).toBe(200);
  });

  test('falls back to Origin against Host when fetch metadata is missing', async () => {
    const host = { Host: 'portal.test' };
    expect((await request('POST', { ...host, Origin: 'https://portal.test' })).status).toBe(200);
    expect((await request('POST', { ...host, Origin: 'https://evil.test' })).status).toBe(403);
    expect((await request('POST', { ...host, Origin: 'null' })).status).toBe(403);
  });

  test('a request with no browser headers at all is not a CSRF vector and passes', async () => {
    expect((await request('POST')).status).toBe(200);
  });

  test('the rejection uses the API error shape', async () => {
    const res = await request('POST', { 'Sec-Fetch-Site': 'cross-site' });
    expect(((await res.json()) as { code: string }).code).toBe('AUTHORIZATION_ERROR');
  });
});
