// app/server/routes/permissions.ts
import type { Variables } from '../types';
import { logger } from '@/modules/logger';
import { RbacService } from '@/modules/rbac/server/rbac.service';
import { BulkPermissionCheckSchema, PermissionCheckSchema } from '@/modules/rbac/types';
import { Hono } from 'hono';

const permissions = new Hono<{ Variables: Variables }>();

// POST /api/permissions/check — single precise check (escape hatch + diagnostics)
permissions.post('/check', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken || !session?.sub) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const parsed = PermissionCheckSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          error: `Invalid request: ${parsed.error.issues.map((e) => e.message).join(', ')}`,
        },
        400
      );
    }

    const { organizationId, resource, verb, group, namespace, name, scope, projectId } =
      parsed.data;
    const result = await new RbacService().checkPermission(organizationId, {
      resource,
      verb,
      group,
      namespace,
      name,
      scope,
      projectId,
    });
    return c.json({ success: true, data: result }, 200);
  } catch (error) {
    logger.error('[permissions] unexpected error in POST /check', error as Error);
    const message = error instanceof Error ? error.message : 'Failed to check permission';
    return c.json({ success: false, error: message }, 500);
  }
});

// POST /api/permissions/bulk-check — batch checks to avoid client-side N+1
permissions.post('/bulk-check', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken || !session?.sub) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const parsed = BulkPermissionCheckSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          success: false,
          error: `Invalid request: ${parsed.error.issues.map((e) => e.message).join(', ')}`,
        },
        400
      );
    }

    const { organizationId, checks } = parsed.data;
    const results = await new RbacService().checkPermissions(organizationId, checks);
    return c.json({ success: true, data: { results } }, 200);
  } catch (error) {
    logger.error('[permissions] unexpected error in POST /bulk-check', error as Error);
    const message = error instanceof Error ? error.message : 'Failed to check permissions';
    return c.json({ success: false, error: message }, 500);
  }
});

export { permissions as permissionsRoutes };
