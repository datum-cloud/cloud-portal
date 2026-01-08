/**
 * RBAC Middleware
 * Server-side route protection based on permissions
 * Uses Hono API for permission checks (similar to org-type middleware)
 */
import type { MiddlewareContext, NextFunction } from '../../utils/middlewares/middleware';
import { extractOrgIdFromPath, resolveDynamicValue } from './permission-checker';
import type { IRbacMiddlewareConfig, OnDeniedContext } from './types';
import type { IPermissionCheckResponse } from '@/modules/rbac/types';
import { env } from '@/utils/env';
import { AuthorizationError } from '@/utils/errors';
import { redirect } from 'react-router';

const PERMISSION_CHECK_PATH = '/api/permissions/check' as const;

/**
 * Default error page path for permission denied
 */
const DEFAULT_ERROR_PATH = '/error/403';

/**
 * Create RBAC middleware that checks permissions before allowing route access
 * Uses BFF API endpoint for permission checks (same pattern as org-type middleware)
 *
 * @param config - Middleware configuration
 * @returns Middleware function
 *
 * @example
 * Basic usage (throws error on denial, caught by ErrorBoundary):
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
 *
 * @example
 * Custom handler with toast notification:
 * ```typescript
 * import { redirectWithToast } from '@/utils/cookies';
 *
 * export const loader = withMiddleware(
 *   async ({ context, params }) => {
 *     // Your loader logic
 *   },
 *   authMiddleware,
 *   createRbacMiddleware({
 *     resource: 'domains',
 *     verb: 'delete',
 *     onDenied: ({ errorMessage, request }) => {
 *       return redirectWithToast('/dashboard', {
 *         type: 'error',
 *         title: 'Permission Denied',
 *         description: errorMessage,
 *       });
 *     },
 *   })
 * );
 * ```
 */
export function createRbacMiddleware(config: IRbacMiddlewareConfig) {
  return async (ctx: MiddlewareContext, next: NextFunction): Promise<Response> => {
    const { request } = ctx;

    try {
      // Extract organization ID from URL
      const orgId = extractOrgIdFromPath(request.url);

      if (!orgId) {
        throw new Error('Organization ID not found in request path');
      }

      // Extract route params from URL path
      // NOTE: Middleware doesn't have access to React Router params directly.
      // We extract params by parsing the URL using known patterns.
      // If you need to extract a new param, add it to the paramPatterns map below.
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/').filter(Boolean);

      // Build params object from URL segments
      // Strategy: Look for common patterns like /resource/:id
      // Examples: /org/:orgId, /project/:projectId, /namespace/:namespace, /domains/:domainId
      const params: Record<string, string> = {};

      // Extract params based on known URL patterns
      // This maps route segment names to param names (e.g., 'project' -> 'projectId')
      const paramPatterns: Record<string, string> = {
        org: 'orgId',
        project: 'projectId',
        // namespace: 'namespace',
        // domains: 'domainId',
        // secrets: 'secretName',
        // configmaps: 'configMapName',
        // workloads: 'workloadName',
        // services: 'serviceName',
        // Add more patterns as needed for your routes
      };

      for (let i = 0; i < pathSegments.length - 1; i++) {
        const segment = pathSegments[i];
        const nextSegment = pathSegments[i + 1];

        // If this segment matches a known pattern, extract the param
        if (paramPatterns[segment] && nextSegment) {
          params[paramPatterns[segment]] = nextSegment;
        }
      }

      // Resolve dynamic values using extracted params
      const namespace = resolveDynamicValue(config.namespace, params);
      const name = resolveDynamicValue(config.name, params);

      // Call BFF API for permission check (similar to org-type middleware)
      const checkResponse = await fetch(`${env.public.appUrl}${PERMISSION_CHECK_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('Cookie') || '',
          'X-Permission-Check-Source': 'rbac-middleware',
        },
        body: JSON.stringify({
          organizationId: orgId,
          resource: config.resource,
          verb: config.verb,
          group: config.group,
          namespace,
          name,
        }),
      });

      const result: IPermissionCheckResponse = await checkResponse.json();

      // Check if permission check was successful
      if (!result.success) {
        throw new AuthorizationError(result.error || 'Permission check failed');
      }

      // Check if permission is allowed
      const { allowed, denied } = result.data!;

      if (!allowed || denied) {
        const errorMessage = `Permission denied: You do not have permission to ${config.verb} ${config.resource}`;

        const onDenied = config.onDenied ?? 'error';

        // Handle custom function
        if (typeof onDenied === 'function') {
          const context: OnDeniedContext = {
            errorMessage,
            resource: config.resource,
            verb: config.verb,
            group: config.group,
            namespace,
            name,
            request,
          };
          return await onDenied(context);
        } else if (onDenied === 'redirect') {
          // Redirect to error page
          const redirectPath = config.redirectTo || DEFAULT_ERROR_PATH;
          return redirect(redirectPath);
        } else {
          // 'error' - Throw error (caught by ErrorBoundary)
          throw new AuthorizationError(errorMessage);
        }
      }

      // Permission granted, proceed to next middleware/loader
      return next();
    } catch (error) {
      // Re-throw AuthorizationError to be caught by ErrorBoundary
      if (error instanceof AuthorizationError) {
        throw error;
      }

      // Handle other errors
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred while checking permissions';

      // Log error for debugging
      console.error('[RBAC Middleware Error]', errorMessage);

      // Return error response for non-authorization errors
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
