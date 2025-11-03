/**
 * PermissionGate Component
 * Conditionally renders children based on permission check
 */
import { useHasPermission } from '@/modules/rbac';
import type { IPermissionGateProps } from '@/modules/rbac';

/**
 * Component that conditionally renders children based on permission
 *
 * @example
 * ```tsx
 * <PermissionGate
 *   resource="workloads"
 *   verb="delete"
 *   namespace="default"
 *   fallback={<DisabledButton />}
 * >
 *   <DeleteWorkloadButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  resource,
  verb,
  group = '',
  namespace,
  name,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent = null,
}: IPermissionGateProps) {
  const { hasPermission, isLoading } = useHasPermission(resource, verb, {
    namespace,
    name,
    group,
  });

  // Show loading state if enabled
  if (isLoading && showLoading) {
    return <>{loadingComponent}</>;
  }

  // If loading and showLoading is false, hide children
  if (isLoading) {
    return <>{fallback}</>;
  }

  // Show children if permission is granted
  if (hasPermission) {
    return <>{children}</>;
  }

  // Show fallback if permission is denied
  return <>{fallback}</>;
}
