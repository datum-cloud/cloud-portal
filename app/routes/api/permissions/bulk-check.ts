/**
 * Bulk Permission Check API Route
 * Check multiple permissions at once
 */
import { RbacService } from '@/modules/rbac';
import { buildPermissionCacheKey } from '@/modules/rbac/permission-checker';
import type {
  IBulkPermissionCheckResponse,
  IBulkPermissionResult,
} from '@/resources/interfaces/permission.interface';
import { BulkPermissionCheckSchema } from '@/resources/schemas/permission.schema';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/permissions/bulk-check' as const;

/**
 * POST /api/permissions/bulk-check
 * Check multiple permissions at once
 */
export const action = async ({ request, context }: ActionFunctionArgs) => {
  try {
    const { controlPlaneClient, cache } = context as AppLoadContext;

    // Parse request body
    const body = await request.json();

    // Validate request with Zod
    const validationResult = BulkPermissionCheckSchema.safeParse(body);

    if (!validationResult.success) {
      throw new BadRequestError(
        `Invalid request: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      );
    }

    const { organizationId, checks } = validationResult.data;

    // Check for noCache query parameter
    const url = new URL(request.url);
    const noCache = url.searchParams.get('noCache') === 'true';

    // Use RbacService for consistent permission checking
    const rbacService = new RbacService(controlPlaneClient as Client);

    // Process each check - try to use cached results first
    const results: IBulkPermissionResult[] = [];
    const checksToPerform: Array<(typeof checks)[number]> = [];
    const checkIndexMap: Map<number, number> = new Map();

    for (let i = 0; i < checks.length; i++) {
      const check = checks[i];

      // Build cache key
      const cacheKey = buildPermissionCacheKey({
        organizationId,
        resource: check.resource,
        verb: check.verb,
        group: check.group || '',
        namespace: check.namespace,
        name: check.name,
      });

      // Try to get from cache
      if (!noCache) {
        const isCached = await cache.hasItem(cacheKey);
        if (isCached) {
          const cachedResult = await cache.getItem(cacheKey);
          if (cachedResult) {
            results[i] = {
              ...(cachedResult as { allowed: boolean; denied: boolean; reason?: string }),
              request: check,
            };
            continue;
          }
        }
      }

      // Add to checks to perform
      checkIndexMap.set(checksToPerform.length, i);
      checksToPerform.push(check);
    }

    // Perform uncached checks using RbacService
    if (checksToPerform.length > 0) {
      // Execute all checks in parallel
      const freshResults = await Promise.allSettled(
        checksToPerform.map(async (check) => {
          const result = await rbacService.checkPermission(organizationId, {
            resource: check.resource,
            verb: check.verb,
            group: check.group,
            namespace: check.namespace,
            name: check.name,
          });

          return {
            allowed: result.allowed,
            denied: result.denied,
            reason: result.reason,
            request: check,
          };
        })
      );

      // Cache and store results
      for (let i = 0; i < freshResults.length; i++) {
        const result = freshResults[i];
        const originalIndex = checkIndexMap.get(i)!;

        let permissionResult: IBulkPermissionResult;

        if (result.status === 'fulfilled') {
          permissionResult = result.value;
        } else {
          // Handle rejected promise
          permissionResult = {
            allowed: false,
            denied: true,
            reason:
              result.reason instanceof Error ? result.reason.message : 'Permission check failed',
            request: checksToPerform[i],
          };
        }

        // Cache the result
        const cacheKey = buildPermissionCacheKey({
          organizationId,
          resource: permissionResult.request.resource,
          verb: permissionResult.request.verb,
          group: permissionResult.request.group || '',
          namespace: permissionResult.request.namespace,
          name: permissionResult.request.name,
        });

        await cache.setItem(cacheKey, {
          allowed: permissionResult.allowed,
          denied: permissionResult.denied,
          reason: permissionResult.reason,
        });

        // Store in results array
        results[originalIndex] = permissionResult;
      }
    }

    // Return combined results
    return data<IBulkPermissionCheckResponse>(
      {
        success: true,
        data: {
          results,
        },
      },
      {
        status: 200,
        headers: {
          'X-Cache-Hits': String(checks.length - checksToPerform.length),
          'X-Cache-Misses': String(checksToPerform.length),
        },
      }
    );
  } catch (error) {
    console.error('[Bulk Permission Check API Error]', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to check permissions';

    return data<IBulkPermissionCheckResponse>(
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
