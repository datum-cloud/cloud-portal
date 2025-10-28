/**
 * usePermissionCheck Hook
 * Check multiple permissions at once with bulk API call
 */
import type { PermissionVerb } from '../types';
import { usePermissions } from './usePermissions';
import { useQuery } from '@tanstack/react-query';

export interface IPermissionCheckInput {
  resource: string;
  verb: PermissionVerb;
  group?: string;
  namespace?: string;
  name?: string;
}

export interface IUsePermissionCheckOptions {
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

export interface IPermissionCheckResult {
  [key: string]: {
    allowed: boolean;
    isLoading: boolean;
    error?: Error;
  };
}

/**
 * Hook to check multiple permissions at once
 *
 * @param checks - Array of permission checks to perform
 * @param options - Additional options
 *
 * @example
 * ```tsx
 * function ResourceList() {
 *   const { permissions, isLoading } = usePermissionCheck([
 *     { resource: 'workloads', verb: 'create' },
 *     { resource: 'secrets', verb: 'create' },
 *     { resource: 'configmaps', verb: 'create' },
 *   ]);
 *
 *   if (isLoading) return <Skeleton />;
 *
 *   return (
 *     <div>
 *       {permissions['workloads:create']?.allowed && <CreateWorkload />}
 *       {permissions['secrets:create']?.allowed && <CreateSecret />}
 *       {permissions['configmaps:create']?.allowed && <CreateConfigMap />}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePermissionCheck(
  checks: IPermissionCheckInput[],
  options?: IUsePermissionCheckOptions
) {
  const { checkPermissions, organizationId } = usePermissions();

  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
  } = options || {};

  // Build query key
  const queryKey = organizationId
    ? [
        'permissions',
        'bulk',
        organizationId,
        ...checks.map(
          (c) => `${c.resource}:${c.verb}:${c.group || '_'}:${c.namespace || '_'}:${c.name || '_'}`
        ),
      ]
    : null;

  const query = useQuery({
    queryKey: queryKey || ['permissions', 'disabled'],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }

      const normalizedChecks = checks.map((check) => ({
        resource: check.resource,
        verb: check.verb,
        group: check.group || '',
        namespace: check.namespace,
        name: check.name,
      }));

      return checkPermissions(normalizedChecks);
    },
    enabled: enabled && !!organizationId && checks.length > 0,
    staleTime,
    gcTime: cacheTime,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  // Transform results into a keyed object for easy access
  const permissions: IPermissionCheckResult = {};

  if (query.data) {
    query.data.forEach((result: any, index: number) => {
      const check = checks[index];
      const key = `${check.resource}:${check.verb}`;
      permissions[key] = {
        allowed: result.allowed && !result.denied,
        isLoading: false,
      };
    });
  } else {
    // If loading or error, return loading state for all checks
    checks.forEach((check: IPermissionCheckInput) => {
      const key = `${check.resource}:${check.verb}`;
      permissions[key] = {
        allowed: false,
        isLoading: query.isLoading,
        error: query.error || undefined,
      };
    });
  }

  return {
    permissions,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
