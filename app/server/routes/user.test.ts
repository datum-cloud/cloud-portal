import type { Variables } from '@/server/types';
import { csrf } from '@/utils/cookies';
import { Hono } from 'hono';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { deleteUser } = vi.hoisted(() => ({
  deleteUser: vi.fn(async (_sub: string) => ({})),
}));

vi.mock('@/resources/users', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/resources/users')>()),
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
