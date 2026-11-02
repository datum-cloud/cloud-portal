import { createWebsiteRoutes } from './index';
import { createStatusCache } from './status-cache';
import type { Variables } from '@/server/types';
import { Hono } from 'hono';
import { describe, expect, test } from 'vitest';

const ORIGIN = 'https://www.datum.net';

function appWithProjectCookie(readProject: () => string | null) {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('session', { sub: 'u1' } as Variables['session']);
    await next();
  });
  app.route(
    '/api/website',
    createWebsiteRoutes({
      origins: [ORIGIN],
      cache: createStatusCache(null),
      rateLimiter: null,
      feedbackCounter: null,
      readPreferredOrg: async () => 'org-1',
      readPreferredProject: async () => readProject(),
      deps: () => ({
        getUser: async () => ({ givenName: 'Ada' }),
        listOrganizations: async () => [{ name: 'org-1', displayName: 'Org 1' }],
        hasProjects: async () => true,
        getProject: async (name) => ({
          name,
          displayName: name.toUpperCase(),
          organizationId: 'org-1',
        }),
        appUrl: 'https://cloud.example.com',
        timeoutMs: 50,
      }),
    })
  );
  return app;
}

async function sessionStatus(app: Hono<{ Variables: Variables }>) {
  const res = await app.request('/api/website/session-status', { headers: { Origin: ORIGIN } });
  return res.json();
}

describe('GET /api/website/session-status cache', () => {
  test('a project switch is not served from the previous project cache entry', async () => {
    const cookies = ['api-a', 'api-b'];
    let current = 0;
    const app = appWithProjectCookie(() => cookies[current]);

    const first = await sessionStatus(app);
    current = 1;
    const second = await sessionStatus(app);

    expect(first).toMatchObject({ project: { name: 'api-a' } });
    expect(second).toMatchObject({ project: { name: 'api-b' } });
  });
});
