import type { PermissionCheckScope, PermissionVerb } from '../types';
import { useCheckQuery } from './useCheckQuery';

export interface UseAccessReviewResult {
  allowed: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseAccessReviewOptions {
  namespace?: string;
  group?: string;
  name?: string;
  scope?: PermissionCheckScope;
  projectId?: string;
  enabled?: boolean;
}

/**
 * Async precise check via real SelfSubjectAccessReview. Use for high-stakes,
 * specific-named-resource checks. Reads organizationId from context (override
 * via options). Fails closed (allowed=false) on error.
 */
export function useAccessReview(
  resource: string,
  verb: PermissionVerb,
  options: UseAccessReviewOptions = {}
): UseAccessReviewResult {
  const { namespace, group = '', name, scope, projectId, enabled = true } = options;

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
    allowed: query.data ? query.data.allowed && !query.data.denied : false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
