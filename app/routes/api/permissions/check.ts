/**
 * Permission Check API Route
 * Single permission check endpoint with caching
 */
import { RbacService } from '@/modules/rbac';
import { buildPermissionCacheKey } from '@/modules/rbac/permission-checker';
import type { IPermissionCheckResponse } from '@/resources/interfaces/permission.interface';
import { PermissionCheckSchema } from '@/resources/schemas/permission.schema';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/permissions/check' as const;

/**
 * POST /api/permissions/check
 * Check a single permission
 */
export const action = async ({ request, context }: ActionFunctionArgs) => {
  try {
    const { controlPlaneClient, cache } = context as AppLoadContext;

    // Parse request body
    const body = await request.json();

    // Validate request with Zod
    const validationResult = PermissionCheckSchema.safeParse(body);

    if (!validationResult.success) {
      throw new BadRequestError(
        `Invalid request: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      );
    }

    const permissionCheck = validationResult.data;

    // Check for noCache query parameter
    const url = new URL(request.url);
    const noCache = url.searchParams.get('noCache') === 'true';

    // Build cache key
    const cacheKey = buildPermissionCacheKey({
      organizationId: permissionCheck.organizationId,
      resource: permissionCheck.resource,
      verb: permissionCheck.verb,
      group: permissionCheck.group,
      namespace: permissionCheck.namespace,
      name: permissionCheck.name,
    });

    // Check cache unless noCache is specified
    if (!noCache) {
      const isCached = await cache.hasItem(cacheKey);
      if (isCached) {
        const cachedResult = await cache.getItem(cacheKey);
        if (cachedResult) {
          return data<IPermissionCheckResponse>(
            {
              success: true,
              data: cachedResult as { allowed: boolean; denied: boolean; reason?: string },
            },
            {
              status: 200,
              headers: {
                'X-Cache': 'HIT',
              },
            }
          );
        }
      }
    }

    // Use RbacService for consistent permission checking
    const rbacService = new RbacService(controlPlaneClient as Client);

    // Check permission using RbacService
    const result = await rbacService.checkPermission(permissionCheck.organizationId, {
      resource: permissionCheck.resource,
      verb: permissionCheck.verb,
      group: permissionCheck.group,
      namespace: permissionCheck.namespace,
      name: permissionCheck.name,
    });

    // Cache result
    await cache.setItem(cacheKey, result);

    // Return result
    return data<IPermissionCheckResponse>(
      {
        success: true,
        data: result,
      },
      {
        status: 200,
        headers: {
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    console.error('[Permission Check API Error]', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to check permission';

    return data<IPermissionCheckResponse>(
      {
        success: false,
        error: errorMessage,
      },
      {
        status: error instanceof BadRequestError ? 400 : 500,
      }
    );
  }
};
