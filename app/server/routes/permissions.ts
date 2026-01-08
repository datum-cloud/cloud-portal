// app/server/routes/permissions.ts
import type { Variables } from '../types';
import { RbacService } from '@/modules/rbac';
import { PermissionCheckSchema } from '@/modules/rbac/types';
import { Hono } from 'hono';

const permissions = new Hono<{ Variables: Variables }>();

// POST /api/permissions/check - Check a single permission
permissions.post('/check', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken || !session?.sub) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    // Parse and validate request body
    const body = await c.req.json();

    const validationResult = PermissionCheckSchema.safeParse(body);
    if (!validationResult.success) {
      return c.json(
        {
          success: false,
          error: `Invalid request: ${validationResult.error.issues.map((e) => e.message).join(', ')}`,
        },
        400
      );
    }

    const { organizationId, resource, verb, group, namespace, name } = validationResult.data;

    // Use RbacService for permission checking
    // No need to pass context - uses global axios client with AsyncLocalStorage
    const rbacService = new RbacService();

    const result = await rbacService.checkPermission(organizationId, {
      resource,
      verb,
      group,
      namespace,
      name,
    });

    return c.json({ success: true, data: result }, 200);
  } catch (error) {
    console.error('[Permission Check API Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check permission';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export { permissions as permissionsRoutes };
