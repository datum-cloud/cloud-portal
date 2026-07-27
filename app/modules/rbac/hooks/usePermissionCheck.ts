import { checkPermissionsBulkAPI } from '../client/rbac-api';
import type { PermissionCheckScope, PermissionVerb } from '../types';
import { usePermissions } from './usePermissions';
import { useQuery } from '@tanstack/react-query';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export interface PermissionCheckInput {
  resource: string;
  verb: PermissionVerb;
  group?: string;
  namespace?: string;
  name?: string;
  scope?: PermissionCheckScope;
}

export interface PermissionCheckResult {
  [key: string]: { allowed: boolean; isLoading: boolean };
}

/**
 * Evaluate multiple permissions in a single bulk request to the BFF. Results are
 * matched to the input checks by index (the server returns them in order).
 * Returns a map keyed by `${resource}:${verb}`. Fails closed.
 */
export function usePermissionCheck(checks: PermissionCheckInput[]) {
  const { organizationId, projectId } = usePermissions();

  const normalizedChecks = checks.map((check) => ({
    resource: check.resource,
    verb: check.verb,
    group: check.group ?? '',
    namespace: check.namespace,
    name: check.name,
    scope: check.scope,
    projectId,
  }));

  const query = useQuery({
    queryKey: ['permission-bulk', organizationId ?? '_', projectId ?? '_', normalizedChecks],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required for permission checks');
      }
      return checkPermissionsBulkAPI(organizationId, normalizedChecks);
    },
    enabled: !!organizationId && checks.length > 0,
    staleTime: STALE_TIME,
    retry: 1,
  });

  // Prefer isPending over isLoading: while the query is disabled (e.g. org
  // context not ready) isLoading is false even though we have no result yet,
  // which lets UIs flash empty/denied states before the check runs.
  const isPermissionsPending = query.isPending;

  const permissions: PermissionCheckResult = {};
  checks.forEach((check, index) => {
    const key = `${check.resource}:${check.verb}`;
    const result = query.data?.[index];
    permissions[key] = {
      allowed: result ? result.allowed && !result.denied : false,
      isLoading: isPermissionsPending,
    };
  });

  return { permissions, isLoading: isPermissionsPending, isError: query.isError };
}
