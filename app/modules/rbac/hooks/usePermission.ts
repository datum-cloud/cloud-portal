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
}

export interface UsePermissionResult {
  hasPermission: boolean;
  isLoading: boolean;
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
  const { namespace, name, group = '', scope, projectId, enabled = true } = options;

  const query = useCheckQuery({
    resource,
    verb,
    group,
    namespace,
    name,
    scope,
    projectId,
    enabled,
  });

  return {
    hasPermission: query.data ? query.data.allowed && !query.data.denied : false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/** Back-compat alias — existing consumers keep this exact signature. */
export const useHasPermission = usePermission;
