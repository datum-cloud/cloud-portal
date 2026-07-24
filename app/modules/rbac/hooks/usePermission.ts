import type { PermissionCheckScope, PermissionVerb } from '../types';
import { useCheckQuery } from './useCheckQuery';

export interface UsePermissionOptions {
  namespace?: string;
  name?: string;
  group?: string;
  scope?: PermissionCheckScope;
  /** Override the project id from context (for project-scoped checks). */
  projectId?: string;
  /**
   * Enable/disable the query. Default: true.
   */
  enabled?: boolean;
  /** Override the default staleTime (ms). Pass 0 to always treat as stale. */
  staleTime?: number;
  /** Override refetch-on-mount. Use 'always' to re-validate the gate on every mount. */
  refetchOnMount?: boolean | 'always';
}

export interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Async per-check permission hook. Resolves a single precise check via the BFF
 * (SelfSubjectAccessReview). `organizationId`/`projectId` default from the
 * RbacProvider context; options can override them. Fails closed.
 */
export function usePermission(
  resource: string,
  verb: PermissionVerb,
  options: UsePermissionOptions = {}
): UsePermissionResult {
  const {
    namespace,
    name,
    group = '',
    scope,
    projectId,
    enabled = true,
    staleTime,
    refetchOnMount,
  } = options;

  const query = useCheckQuery({
    resource,
    verb,
    group,
    namespace,
    name,
    scope,
    projectId,
    enabled,
    staleTime,
    refetchOnMount,
  });

  return {
    hasPermission: query.data ? query.data.allowed && !query.data.denied : false,
    // Prefer isPending: disabled/idle queries have isLoading=false with no data,
    // which would flash denied UI before the check runs.
    isLoading: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/** Back-compat alias — existing consumers keep this exact signature. */
export const useHasPermission = usePermission;
