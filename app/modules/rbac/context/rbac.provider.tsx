/**
 * RBAC Provider
 * Provides permission checking functionality to the application (client-side only)
 */
import { checkPermissionAPI, checkPermissionsBulkAPI } from '../client/rbac-api';
import type {
  IPermissionContext,
  IPermissionCheck,
  IPermissionResult,
  IBulkPermissionResult,
} from '../types';
import { RbacContext } from './rbac.context';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

interface IRbacProviderProps {
  children: React.ReactNode;
  organizationId?: string;
}

/**
 * Provider component that supplies RBAC functionality (client-side only)
 *
 * @example
 * ```tsx
 * <RbacProvider organizationId={orgId}>
 *   <YourApp />
 * </RbacProvider>
 * ```
 */
export function RbacProvider({ children, organizationId }: IRbacProviderProps) {
  const queryClient = useQueryClient();

  /**
   * Check a single permission (uses client API)
   */
  const checkPermission = useCallback(
    async (check: Omit<IPermissionCheck, 'organizationId'>): Promise<IPermissionResult> => {
      if (!organizationId) {
        throw new Error('Organization ID is required for permission checks');
      }

      const fullCheck: IPermissionCheck = {
        ...check,
        organizationId,
        group: check.group || '',
      };

      // Use client API (browser-only fetch with relative URLs)
      return await checkPermissionAPI(fullCheck);
    },
    [organizationId]
  );

  /**
   * Check multiple permissions at once (uses client API)
   */
  const checkPermissions = useCallback(
    async (
      checks: Array<Omit<IPermissionCheck, 'organizationId'>>
    ): Promise<IBulkPermissionResult[]> => {
      if (!organizationId) {
        throw new Error('Organization ID is required for permission checks');
      }

      // Normalize checks
      const normalizedChecks = checks.map((check) => ({
        ...check,
        group: check.group || '',
      }));

      // Use client API (browser-only fetch with relative URLs)
      return await checkPermissionsBulkAPI(organizationId, normalizedChecks);
    },
    [organizationId]
  );

  /**
   * Invalidate all permission caches
   */
  const invalidateCache = useCallback(() => {
    // Invalidate all queries that start with 'permission'
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return Array.isArray(queryKey) && queryKey[0] === 'permission';
      },
    });
  }, [queryClient]);

  /**
   * Context value
   */
  const contextValue: IPermissionContext = useMemo(
    () => ({
      checkPermission,
      checkPermissions,
      invalidateCache,
      organizationId,
    }),
    [checkPermission, checkPermissions, invalidateCache, organizationId]
  );

  return <RbacContext.Provider value={contextValue}>{children}</RbacContext.Provider>;
}
