import { checkPermissionsBulkAPI, type BulkCheckResult } from '../client/rbac-api';
import type { PermissionCheckScope, PermissionVerb } from '../types';
import { usePermissions } from './usePermissions';
import { shouldRetryQuery } from '@/modules/tanstack/query';
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

/** Row sent to the BFF: normalized `group` string plus, for project-scoped checks, the resolved projectId. */
type BulkCheckRow = PermissionCheckInput & { group: string } & { projectId?: string };

interface PartitionRow<T = BulkCheckRow> {
  index: number;
  check: T;
}

export interface PartitionedPermissionChecks<T = BulkCheckRow> {
  org: PartitionRow<T>[];
  project: PartitionRow<T>[];
}

/**
 * Split a batch of checks into org-scoped and project-scoped partitions,
 * preserving each row's original index so results can be re-mapped back to the
 * caller's array order. Any check whose `scope` is NOT 'project' (org scope or
 * absent — the default) routes to the org partition.
 */
export function partitionPermissionChecks<T extends PermissionCheckInput>(
  checks: T[]
): PartitionedPermissionChecks<T> {
  const partition: PartitionedPermissionChecks<T> = { org: [], project: [] };
  checks.forEach((check, index) => {
    (check.scope === 'project' ? partition.project : partition.org).push({ index, check });
  });
  return partition;
}

/**
 * Evaluate multiple permissions in a single bulk request to the BFF. Results are
 * matched to the input checks by index (the server returns them in order).
 * Returns a map keyed by `${resource}:${verb}`. Fails closed.
 *
 * The batch is split by scope so the two partitions don't block each other:
 * - org-scoped checks run as soon as the org context exists — they never wait
 *   for the project context to resolve.
 * - project-scoped checks stay disabled (fail-closed) until projectId resolves
 *   (it flows in via layout effects), preserving the server-side projectId
 *   invariant.
 *
 * Splitting also keeps projectId out of the org partition's cache key, so
 * switching projects does not invalidate org results.
 */
export function usePermissionCheck(checks: PermissionCheckInput[]) {
  const { organizationId, projectId } = usePermissions();

  // Embed projectId only on project-scoped rows. Org rows carry an undefined
  // projectId so their portion of the cache stays stable across project
  // switches.
  const normalizedChecks: BulkCheckRow[] = checks.map((check) => ({
    resource: check.resource,
    verb: check.verb,
    group: check.group ?? '',
    namespace: check.namespace,
    name: check.name,
    scope: check.scope,
    projectId: check.scope === 'project' ? projectId : undefined,
  }));

  const { org, project } = partitionPermissionChecks(normalizedChecks);
  const orgChecks = org.map(({ check }) => check);
  const projectChecks = project.map(({ check }) => check);

  const orgQuery = useQuery({
    queryKey: ['permission-bulk', organizationId ?? '_', 'org', orgChecks],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required for permission checks');
      }
      return checkPermissionsBulkAPI(organizationId, orgChecks);
    },
    enabled: !!organizationId && orgChecks.length > 0,
    staleTime: STALE_TIME,
    retry: shouldRetryQuery,
  });

  const projectQuery = useQuery({
    queryKey: [
      'permission-bulk',
      organizationId ?? '_',
      projectId ?? '_',
      'project',
      projectChecks,
    ],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required for permission checks');
      }
      return checkPermissionsBulkAPI(organizationId, projectChecks);
    },
    enabled: !!organizationId && !!projectId && projectChecks.length > 0,
    staleTime: STALE_TIME,
    retry: shouldRetryQuery,
  });

  // Prefer isPending over isLoading: while a query is disabled (e.g. project
  // context not ready) isLoading is false even though we have no result yet,
  // which lets UIs flash empty/denied states before the check runs.
  //
  // A partition with NO checks has its query intentionally disabled, and a
  // disabled query with no data reports isPending: true. That must not hold
  // the whole batch in 'loading', so only count a partition's pending state
  // when it actually has checks to resolve.
  const orgPending = orgChecks.length > 0 && orgQuery.isPending;
  const projectPending = projectChecks.length > 0 && projectQuery.isPending;
  const isPermissionsPending = orgPending || projectPending;

  const permissions: PermissionCheckResult = {};

  const applyPartition = (
    rows: PartitionRow[],
    data: BulkCheckResult[] | undefined,
    pending: boolean
  ) => {
    rows.forEach((row, position) => {
      const result = data?.[position];
      const key = `${row.check.resource}:${row.check.verb}`;
      permissions[key] = {
        allowed: result ? result.allowed && !result.denied : false,
        isLoading: pending,
      };
    });
  };

  applyPartition(org, orgQuery.data, orgPending);
  applyPartition(project, projectQuery.data, projectPending);

  return {
    permissions,
    isLoading: isPermissionsPending,
    isError: orgQuery.isError || projectQuery.isError,
  };
}
