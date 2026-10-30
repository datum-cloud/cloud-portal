// app/server/routes/user.ts
import type { Variables } from '../types';
import { createUserService, userSchema, userPreferencesSchema } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { validateCSRF } from '@/utils/cookies';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const user = new Hono<{ Variables: Variables }>();

/**
 * Service errors carry `status`; `HttpError`, which a failed CSRF check
 * throws, carries `statusCode`. Reading only the first turned every CSRF
 * rejection into a 500.
 */
function errorStatus(error: any): ContentfulStatusCode {
  return error?.status || error?.statusCode || 500;
}

/** Checks the `csrf` field of a JSON body against the CSRF cookie; 403 when it does not match. */
async function validatePayloadCSRF(payload: { csrf?: unknown }, headers: Headers) {
  const formData = new FormData();
  formData.append('csrf', typeof payload?.csrf === 'string' ? payload.csrf : '');
  await validateCSRF(formData, headers);
}

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
    return c.json({ success: false, error: error.message }, errorStatus(error));
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
    await validatePayloadCSRF(payload, c.req.raw.headers);

    // Validate form data with Zod
    const parsed = userSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid form data' }, 400);
    }

    const userService = createUserService();
    const res = await userService.update(session.sub, parsed.data);

    return c.json({ success: true, data: res });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, errorStatus(error));
  }
});

// DELETE /api/user - Delete current user
user.delete('/', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.sub) {
      return c.redirect(paths.auth.logOut);
    }

    // Irreversible, so a cookie alone is not enough: the caller must also echo
    // the CSRF token from the root loader, as the PATCH routes do. The UI
    // deletes accounts through the K8s proxy, so nothing calls this today.
    const payload = await c.req.json().catch(() => ({}));
    await validatePayloadCSRF(payload, c.req.raw.headers);

    const userService = createUserService();
    await userService.delete(session.sub);

    return c.redirect(paths.auth.logOut);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, errorStatus(error));
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
    await validatePayloadCSRF(payload, c.req.raw.headers);

    // Validate form data with Zod
    const parsed = userPreferencesSchema.safeParse(payload);

    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid form data' }, 400);
    }

    const userService = createUserService();
    const res = await userService.updatePreferences(session.sub, parsed.data);

    return c.json({ success: true, data: res });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, errorStatus(error));
  }
});

export { user as userRoutes };
