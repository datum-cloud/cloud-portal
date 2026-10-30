/// <reference types="bun-types/test" />
import type { Variables } from '@/server/types';
import { csrf } from '@/utils/cookies';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';

const deleteUser = mock(async (_sub: string) => ({}));

// Spread the real module so other test files that import it are unaffected.
const users = await import('@/resources/users');
mock.module('@/resources/users', () => ({
  ...users,
  createUserService: () => ({ delete: deleteUser }),
}));

const { userRoutes } = await import('./user');

function appWithSession() {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('session', { sub: 'u1' } as Variables['session']);
    await next();
  });
  app.route('/', userRoutes);
  return app;
}

describe('PATCH /api/user', () => {
  test('a bad CSRF token is a 403, not a 500', async () => {
    const res = await appWithSession().request('/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csrf: 'forged' }),
    });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/user', () => {
  beforeEach(() => deleteUser.mockClear());

  test('refuses without the CSRF token and deletes nothing', async () => {
    const res = await appWithSession().request('/', { method: 'DELETE' });
    expect(res.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  test('refuses a token that does not match the CSRF cookie', async () => {
    const [, cookie] = await csrf.commitToken();
    const res = await appWithSession().request('/', {
      method: 'DELETE',
      headers: { Cookie: cookie ?? '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ csrf: 'forged' }),
    });
    expect(res.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  test('deletes the session user and signs out when the token matches', async () => {
    const [token, cookie] = await csrf.commitToken();
    const res = await appWithSession().request('/', {
      method: 'DELETE',
      headers: { Cookie: cookie ?? '', 'Content-Type': 'application/json' },
      body: JSON.stringify({ csrf: token }),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('/logout');
    expect(deleteUser).toHaveBeenCalledWith('u1');
  });
});
