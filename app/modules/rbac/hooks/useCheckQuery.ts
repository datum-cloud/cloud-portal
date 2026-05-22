import { checkPermissionAPI } from '../client/rbac-api';
import type { PermissionCheckScope, PermissionVerb } from '../types';
import { usePermissions } from './usePermissions';
import { useQuery } from '@tanstack/react-query';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

export interface CheckQueryParams {
  resource: string;
  verb: PermissionVerb;
  group?: string;
  namespace?: string;
  name?: string;
  scope?: PermissionCheckScope;
  /** Override the project id from context (project-scoped checks). */
  projectId?: string;
  /** Override the organization id from context. */
  organizationId?: string;
  enabled?: boolean;
}

/**
 * Shared async per-check query. Posts a single precise check to the BFF
 * (`POST /api/permissions/check`), which runs a scope-aware
 * SelfSubjectAccessReview. Fails closed.
 */
export function useCheckQuery(params: CheckQueryParams) {
  const ctx = usePermissions();
  const { resource, verb, group = '', namespace, name, scope, enabled = true } = params;

  const organizationId = params.organizationId ?? ctx.organizationId;
  const projectId = params.projectId ?? ctx.projectId;

  const query = useQuery({
    queryKey: [
      'permission',
      organizationId ?? '_',
      projectId ?? '_',
      resource,
      verb,
      group,
      namespace ?? '_',
      name ?? '_',
      scope ?? '_',
    ],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required for permission checks');
      }
      return checkPermissionAPI({
        organizationId,
        resource,
        verb,
        group,
        namespace,
        name,
        scope,
        projectId,
      });
    },
    enabled: enabled && !!organizationId,
    staleTime: STALE_TIME,
    retry: 1,
  });

  return query;
}
