/**
 * useHasPermission Hook
 * Check if user has a specific permission with loading state
 */
import type { PermissionVerb } from '../types';
import { usePermissions } from './usePermissions';
import { useQuery } from '@tanstack/react-query';

export interface IUseHasPermissionOptions {
  namespace?: string;
  name?: string;
  group?: string;
  /**
   * Enable/disable the query
   * Default: true
   */
  enabled?: boolean;
  /**
   * Stale time in milliseconds
   * Default: 5 minutes
   */
  staleTime?: number;
  /**
   * Cache time in milliseconds
   * Default: 10 minutes
   */
  cacheTime?: number;
}

export interface IUseHasPermissionResult {
  /**
   * Whether the permission is allowed
   */
  hasPermission: boolean;
  /**
   * Whether the query is loading
   */
  isLoading: boolean;
  /**
   * Whether the query has an error
   */
  isError: boolean;
  /**
   * Error object if query failed
   */
  error: Error | null;
  /**
   * Refetch the permission check
   */
  refetch: () => void;
}

/**
 * Hook to check if user has a specific permission
 *
 * @param resource - Resource name (e.g., 'workloads', 'secrets')
 * @param verb - Action verb (e.g., 'get', 'list', 'create')
 * @param options - Additional options
 *
 * @example
 * ```tsx
 * function WorkloadActions({ namespace }) {
 *   const { hasPermission, isLoading } = useHasPermission(
 *     'workloads',
 *     'delete',
 *     { namespace }
 *   );
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <div>
 *       {hasPermission && <DeleteButton />}
 *       <ViewButton />
 *     </div>
 *   );
 * }
 * ```
 */
export function useHasPermission(
  resource: string,
  verb: PermissionVerb,
  options?: IUseHasPermissionOptions
): IUseHasPermissionResult {
  const { checkPermission, organizationId } = usePermissions();

  const {
    namespace,
    name,
    group = '',
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
  } = options || {};

  // Build query key
  const queryKey = organizationId
    ? ['permission', organizationId, resource, verb, group, namespace || '_', name || '_']
    : null;

  const query = useQuery({
    queryKey: queryKey || ['permission', 'disabled'],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      return checkPermission({
        resource,
        verb,
        group,
        namespace,
        name,
      });
    },
    enabled: enabled && !!organizationId,
    staleTime,
    gcTime: cacheTime,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  return {
    hasPermission: query.data?.allowed && !query.data?.denied ? true : false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
