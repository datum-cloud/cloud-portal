/**
 * RBAC Middleware
 * Server-side route protection based on permissions
 * Uses server-side RbacService for permission checks
 */
import type { NextFunction } from '../../utils/middlewares/middleware';
import { extractOrgIdFromPath, resolveDynamicValue } from './permission-checker';
import { RbacService } from './service/rbac.service';
import type { IRbacMiddlewareConfig } from './types';
import type { Client } from '@hey-api/client-axios';
import { redirect } from 'react-router';
import type { AppLoadContext } from 'react-router';

/**
 * Default error page path for permission denied
 */
const DEFAULT_ERROR_PATH = '/error/403';

/**
 * Create RBAC middleware that checks permissions before allowing route access
 * Uses server-side RbacService for direct permission checks
 *
 * @param config - Middleware configuration
 * @param context - Optional app context (if available in middleware chain)
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * export const loader = withMiddleware(
 *   async ({ context, params }) => {
 *     // Your loader logic
 *   },
 *   authMiddleware,
 *   createRbacMiddleware({
 *     resource: 'workloads',
 *     verb: 'list',
 *     namespace: (params) => params.namespace,
 *   })
 * );
 * ```
 */
export function createRbacMiddleware(config: IRbacMiddlewareConfig) {
  return async (request: Request, next: NextFunction): Promise<Response> => {
    try {
      // Extract organization ID from URL
      const orgId = extractOrgIdFromPath(request.url);

      if (!orgId) {
        throw new Error('Organization ID not found in request path');
      }

      // Get route params from URL for dynamic value resolution
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const params: Record<string, string> = {};

      // Simple param extraction (can be enhanced if needed)
      pathSegments.forEach((segment, index) => {
        if (segment.startsWith(':')) {
          const paramName = segment.slice(1);
          const paramValue = pathSegments[index];
          if (paramValue && !paramValue.startsWith(':')) {
            params[paramName] = paramValue;
          }
        }
      });

      // Resolve dynamic values
      const namespace = resolveDynamicValue(config.namespace, params);
      const name = resolveDynamicValue(config.name, params);

      // Get context from request (added by withMiddleware)
      // Note: This requires the middleware system to attach context to request
      const context = (request as any).context as AppLoadContext;

      if (!context || !context.controlPlaneClient) {
        throw new Error('App context or controlPlaneClient not available in middleware');
      }

      // Create server-side RBAC service
      const rbacService = new RbacService(context.controlPlaneClient as Client);

      // Check permission using server-side service
      const result = await rbacService.checkPermission(orgId, {
        resource: config.resource,
        verb: config.verb,
        group: config.group,
        namespace,
        name,
      });

      // Check if permission is allowed
      const { allowed, denied } = result;

      if (!allowed || denied) {
        const errorMessage = `Permission denied: You do not have permission to ${config.verb} ${config.resource}${namespace ? ` in namespace ${namespace}` : ''}`;

        const onDenied = config.onDenied || 'both';

        // Handle based on onDenied strategy
        if (onDenied === 'redirect') {
          // Redirect to error page
          const redirectPath = config.redirectTo || DEFAULT_ERROR_PATH;
          return redirect(`${redirectPath}?reason=${encodeURIComponent(errorMessage)}`);
        } else if (onDenied === 'error') {
          // Throw error to show in current page
          throw new Error(errorMessage);
        } else {
          // 'both' - return error response with redirect option
          return new Response(
            JSON.stringify({
              success: false,
              error: errorMessage,
              permissionCheck: {
                resource: config.resource,
                verb: config.verb,
                namespace,
                name,
              },
              redirectTo: config.redirectTo || DEFAULT_ERROR_PATH,
            }),
            {
              status: 403,
              statusText: 'Forbidden',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }
      }

      // Permission granted, proceed to next middleware/loader
      return next();
    } catch (error) {
      // Handle errors
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred while checking permissions';

      // Log error for debugging
      console.error('[RBAC Middleware Error]', errorMessage);

      // Return error response
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
        }),
        {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}

/**
 * Convenience function to create RBAC middleware for common resource operations
 */
export const rbacMiddleware = {
  /**
   * Check list permission
   */
  canList: (resource: string, group?: string, namespace?: string) =>
    createRbacMiddleware({
      resource,
      verb: 'list',
      group,
      namespace,
    }),

  /**
   * Check get permission
   */
  canGet: (resource: string, group?: string, namespace?: string, name?: string) =>
    createRbacMiddleware({
      resource,
      verb: 'get',
      group,
      namespace,
      name,
    }),

  /**
   * Check create permission
   */
  canCreate: (resource: string, group?: string, namespace?: string) =>
    createRbacMiddleware({
      resource,
      verb: 'create',
      group,
      namespace,
    }),

  /**
   * Check update permission
   */
  canUpdate: (resource: string, group?: string, namespace?: string, name?: string) =>
    createRbacMiddleware({
      resource,
      verb: 'update',
      group,
      namespace,
      name,
    }),

  /**
   * Check delete permission
   */
  canDelete: (resource: string, group?: string, namespace?: string, name?: string) =>
    createRbacMiddleware({
      resource,
      verb: 'delete',
      group,
      namespace,
      name,
    }),
};
