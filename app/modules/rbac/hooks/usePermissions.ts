/**
 * usePermissions Hook
 * Access RBAC context and permission checking functionality
 */
import { RbacContext } from '../context/rbac.context';
import { useContext } from 'react';

/**
 * Hook to access permission context
 *
 * @throws Error if used outside of RbacProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { checkPermission, invalidateCache } = usePermissions();
 *
 *   const handleCheck = async () => {
 *     const result = await checkPermission({
 *       resource: 'workloads',
 *       verb: 'list',
 *       namespace: 'default',
 *     });
 *     console.log('Allowed:', result.allowed);
 *   };
 *
 *   return <button onClick={handleCheck}>Check Permission</button>;
 * }
 * ```
 */
export function usePermissions() {
  const context = useContext(RbacContext);

  if (!context) {
    throw new Error('usePermissions must be used within RbacProvider');
  }

  return context;
}
