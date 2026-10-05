import { createComputeWorkloadService, computeWorkloadKeys } from './compute-workload.service';
import type { ComDatumapisComputeV1AlphaWorkload } from '@/modules/control-plane/compute';
import {
  resolveRelatedResource,
  type RelatedResourceResult,
} from '@/resources/http-proxies/related-resource';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Whether a workload still exists, as far as the viewer can tell:
 * - `present`: readable and not being torn down.
 * - `missing`: 404, or already terminating (deletionTimestamp set).
 * - `unknown`: 403 or any other error — can't tell, so callers keep their
 *   normal rendering rather than claiming the workload is gone.
 */
export type ComputeWorkloadPresence = 'present' | 'missing' | 'unknown';

export function toComputeWorkloadPresence(
  result: RelatedResourceResult<ComDatumapisComputeV1AlphaWorkload>
): ComputeWorkloadPresence {
  if (result.state === 'absent') return 'missing';
  if (result.state !== 'ok') return 'unknown';
  return result.data?.metadata?.deletionTimestamp ? 'missing' : 'present';
}

function computeWorkloadPresenceQuery(projectId: string, name: string | undefined) {
  return {
    queryKey: computeWorkloadKeys.detail(projectId, name ?? ''),
    queryFn: async (): Promise<ComputeWorkloadPresence> => {
      if (!name) return 'unknown';
      const result = await resolveRelatedResource(
        () => createComputeWorkloadService().get(projectId, name),
        { onUnexpected: 'absorb' }
      );
      return toComputeWorkloadPresence(result);
    },
    retry: false,
    enabled: !!projectId && !!name,
  };
}

/**
 * Check that a compute workload exists. Errors never surface: 403/404 and
 * unexpected failures all resolve to a presence value, so a missing permission
 * or a flaky read never blanks the ALB overview.
 */
export function useComputeWorkloadPresence(projectId: string, name: string | undefined) {
  return useQuery(computeWorkloadPresenceQuery(projectId, name));
}

/**
 * The named workloads that are gone (`missing`), for a backend pool that
 * fronts several. Shares the single-workload cache entries, and like it never
 * reports a workload it can't read as missing.
 */
export function useMissingComputeWorkloads(
  projectId: string,
  names: readonly string[]
): ReadonlySet<string> {
  const presence = useQueries({
    queries: names.map((name) => computeWorkloadPresenceQuery(projectId, name)),
    combine: (results) => results.map((result) => result.data),
  });
  return useMemo(
    () => new Set(names.filter((_, index) => presence[index] === 'missing')),
    [names, presence]
  );
}
