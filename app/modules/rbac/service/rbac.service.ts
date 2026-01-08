/**
 * Server-side RBAC Service
 * Uses access-review service for server-side permission checks
 */
import type { IPermissionResult, IBulkPermissionResult } from '../types';
import { createAccessReviewService, type SupportedVerb } from '@/resources/access-review';

interface PermissionCheckInput {
  resource: string;
  verb: SupportedVerb;
  group?: string;
  namespace?: string;
  name?: string;
}

/**
 * Server-side RBAC Service
 *
 * @example
 * ```typescript
 * // In a loader or action
 * export const loader = async ({ context }: LoaderFunctionArgs) => {
 *   const rbacService = new RbacService();
 *
 *   const canCreate = await rbacService.checkPermission('org-123', {
 *     resource: 'workloads',
 *     verb: 'create',
 *     namespace: 'default',
 *   });
 *
 *   return { canCreate: canCreate.allowed };
 * };
 * ```
 */
export class RbacService {
  /**
   * Check single permission (server-side)
   *
   * @param organizationId - Organization ID
   * @param check - Permission check parameters
   * @returns Permission result
   */
  async checkPermission(
    organizationId: string,
    check: PermissionCheckInput
  ): Promise<IPermissionResult> {
    // Services now use global axios client with AsyncLocalStorage
    const accessReviewService = createAccessReviewService();

    try {
      const result = await accessReviewService.create(organizationId, {
        namespace: check.namespace || '',
        verb: check.verb,
        group: check.group || '',
        resource: check.resource,
        name: check.name,
      });

      return {
        allowed: 'allowed' in result ? result.allowed : false,
        denied: 'denied' in result ? result.denied : true,
        reason: undefined,
      };
    } catch (error) {
      console.error('[RbacService] Permission check error:', error);
      return {
        allowed: false,
        denied: true,
        reason: error instanceof Error ? error.message : 'Permission check failed',
      };
    }
  }

  /**
   * Check multiple permissions (server-side)
   *
   * @param organizationId - Organization ID
   * @param checks - Array of permission checks
   * @returns Array of permission results
   */
  async checkPermissions(
    organizationId: string,
    checks: PermissionCheckInput[]
  ): Promise<IBulkPermissionResult[]> {
    const accessReviewService = createAccessReviewService();

    // Execute all checks in parallel
    const results = await Promise.allSettled(
      checks.map(async (check) => {
        const result = await accessReviewService.create(organizationId, {
          namespace: check.namespace || '',
          verb: check.verb,
          group: check.group || '',
          resource: check.resource,
          name: check.name,
        });

        return {
          allowed: 'allowed' in result ? result.allowed : false,
          denied: 'denied' in result ? result.denied : true,
          reason: undefined,
          request: {
            ...check,
            group: check.group || '',
          },
        };
      })
    );

    // Map results, handling both fulfilled and rejected promises
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Handle rejected promise
        const check = checks[index];
        return {
          allowed: false,
          denied: true,
          reason:
            result.reason instanceof Error ? result.reason.message : 'Permission check failed',
          request: {
            ...check,
            group: check.group || '',
          },
        };
      }
    });
  }

  /**
   * Convenience method: Check if user can list resources
   */
  async canList(
    organizationId: string,
    resource: string,
    namespace?: string,
    group?: string
  ): Promise<boolean> {
    const result = await this.checkPermission(organizationId, {
      resource,
      verb: 'list',
      namespace,
      group,
    });

    return result.allowed && !result.denied;
  }

  /**
   * Convenience method: Check if user can get a specific resource
   */
  async canGet(
    organizationId: string,
    resource: string,
    name?: string,
    namespace?: string,
    group?: string
  ): Promise<boolean> {
    const result = await this.checkPermission(organizationId, {
      resource,
      verb: 'get',
      name,
      namespace,
      group,
    });

    return result.allowed && !result.denied;
  }

  /**
   * Convenience method: Check if user can create resources
   */
  async canCreate(
    organizationId: string,
    resource: string,
    namespace?: string,
    group?: string
  ): Promise<boolean> {
    const result = await this.checkPermission(organizationId, {
      resource,
      verb: 'create',
      namespace,
      group,
    });

    return result.allowed && !result.denied;
  }

  /**
   * Convenience method: Check if user can update a specific resource
   */
  async canUpdate(
    organizationId: string,
    resource: string,
    name?: string,
    namespace?: string,
    group?: string
  ): Promise<boolean> {
    const result = await this.checkPermission(organizationId, {
      resource,
      verb: 'update',
      name,
      namespace,
      group,
    });

    return result.allowed && !result.denied;
  }

  /**
   * Convenience method: Check if user can delete a specific resource
   */
  async canDelete(
    organizationId: string,
    resource: string,
    name?: string,
    namespace?: string,
    group?: string
  ): Promise<boolean> {
    const result = await this.checkPermission(organizationId, {
      resource,
      verb: 'delete',
      name,
      namespace,
      group,
    });

    return result.allowed && !result.denied;
  }
}
