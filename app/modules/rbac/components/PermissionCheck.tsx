/**
 * PermissionCheck Component
 * Check multiple permissions with AND/OR logic
 */
import { usePermissionCheck, combinePermissionsAND, combinePermissionsOR } from '@/modules/rbac';
import type { IPermissionCheckProps } from '@/modules/rbac';

/**
 * Component that checks multiple permissions and conditionally renders children
 *
 * @example
 * ```tsx
 * // Require ALL permissions (AND)
 * <PermissionCheck
 *   checks={[
 *     { resource: 'workloads', verb: 'create' },
 *     { resource: 'secrets', verb: 'list' }
 *   ]}
 *   operator="AND"
 * >
 *   <CreateWorkloadForm />
 * </PermissionCheck>
 *
 * // Require ANY permission (OR)
 * <PermissionCheck
 *   checks={[
 *     { resource: 'workloads', verb: 'update' },
 *     { resource: 'workloads', verb: 'patch' }
 *   ]}
 *   operator="OR"
 * >
 *   <EditButton />
 * </PermissionCheck>
 * ```
 */
export function PermissionCheck({
  checks,
  operator = 'AND',
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: IPermissionCheckProps) {
  const { permissions, isLoading } = usePermissionCheck(checks);

  // Show loading state if enabled
  if (isLoading && showLoading) {
    return <>{loadingComponent}</>;
  }

  // If loading and showLoading is false, hide children
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Get all permission results
  const results = checks.map((check) => {
    const key = `${check.resource}:${check.verb}`;
    const permission = permissions[key];
    return {
      allowed: permission?.allowed || false,
      denied: !permission?.allowed,
    };
  });

  // Check if permissions are satisfied based on operator
  let hasPermission = false;

  if (operator === 'AND') {
    hasPermission = combinePermissionsAND(results);
  } else {
    hasPermission = combinePermissionsOR(results);
  }

  // Show children if permission check passes
  if (hasPermission) {
    return <>{children}</>;
  }

  // Show fallback if permission check fails
  return <>{fallback}</>;
}
