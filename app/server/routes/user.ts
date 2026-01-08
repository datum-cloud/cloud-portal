// app/server/routes/user.ts
import type { Variables } from '../types';
import { createUserService, userSchema, userPreferencesSchema } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { validateCSRF } from '@/utils/cookies';
import { Hono } from 'hono';

const user = new Hono<{ Variables: Variables }>();

// GET /api/user - Get current user
user.get('/', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.sub) {
      return c.redirect(paths.auth.logOut);
    }

    // Services now use global axios client with AsyncLocalStorage
    // No need to pass controlPlaneClient - token/requestId auto-injected
    const userService = createUserService();
    const userData = await userService.get(session.sub);

    return c.json({ success: true, data: userData });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, error.status || 500);
  }
});

// PATCH /api/user - Update current user
user.patch('/', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.sub) {
      return c.redirect(paths.auth.logOut);
    }

    const payload = await c.req.json();
    const { csrf } = payload;

    // Create FormData to validate CSRF token
    const formData = new FormData();
    formData.append('csrf', csrf);

    // Validate the CSRF token against the request headers
    await validateCSRF(formData, c.req.raw.headers);

    // Validate form data with Zod
    const parsed = userSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid form data' }, 400);
    }

    const userService = createUserService();
    const res = await userService.update(session.sub, parsed.data);

    return c.json({ success: true, data: res });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, error.status || 500);
  }
});

// DELETE /api/user - Delete current user
user.delete('/', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.sub) {
      return c.redirect(paths.auth.logOut);
    }

    const userService = createUserService();
    await userService.delete(session.sub);

    return c.redirect(paths.auth.logOut);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, error.status || 500);
  }
});

// PATCH /api/user/preferences - Update user preferences
user.patch('/preferences', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.sub) {
      return c.redirect(paths.auth.logOut);
    }

    const payload = await c.req.json();
    const { csrf } = payload;

    // Create FormData to validate CSRF token
    const formData = new FormData();
    formData.append('csrf', csrf);

    // Validate the CSRF token against the request headers
    await validateCSRF(formData, c.req.raw.headers);

    // Validate form data with Zod
    const parsed = userPreferencesSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid form data' }, 400);
    }

    const userService = createUserService();
    const res = await userService.updatePreferences(session.sub, parsed.data);

    return c.json({ success: true, data: res });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, error.status || 500);
  }
});

export { user as userRoutes };
