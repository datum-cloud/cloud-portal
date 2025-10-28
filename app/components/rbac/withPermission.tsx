/**
 * withPermission HOC
 * Higher-order component that wraps components with permission checking
 */
import { PermissionGate } from './PermissionGate';
import type { PermissionVerb } from '@/modules/rbac/types';
import { ComponentType } from 'react';

interface IWithPermissionConfig {
  resource: string;
  verb: PermissionVerb;
  group?: string;
  namespace?: string;
  name?: string;
  fallback?: React.ReactNode;
  showLoading?: boolean;
  loadingComponent?: React.ReactNode;
}

/**
 * Higher-order component that wraps a component with permission checking
 *
 * @param Component - Component to wrap
 * @param config - Permission configuration
 *
 * @example
 * ```tsx
 * const DeleteButton = ({ onClick }) => (
 *   <button onClick={onClick}>Delete</button>
 * );
 *
 * const ProtectedDeleteButton = withPermission(DeleteButton, {
 *   resource: 'workloads',
 *   verb: 'delete',
 *   fallback: <button disabled>Delete (No Permission)</button>,
 * });
 *
 * // Usage
 * <ProtectedDeleteButton onClick={handleDelete} />
 * ```
 */
export function withPermission<P extends object>(
  Component: ComponentType<P>,
  config: IWithPermissionConfig
): ComponentType<P> {
  const WrappedComponent = (props: P) => {
    return (
      <PermissionGate
        resource={config.resource}
        verb={config.verb}
        group={config.group}
        namespace={config.namespace}
        name={config.name}
        fallback={config.fallback}
        showLoading={config.showLoading}
        loadingComponent={config.loadingComponent}>
        <Component {...props} />
      </PermissionGate>
    );
  };

  // Set display name for better debugging
  WrappedComponent.displayName = `withPermission(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
