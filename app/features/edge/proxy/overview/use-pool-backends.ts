import { toBackendRows, type BackendRow } from '@/features/edge/proxy/backends/backend-pool';
import { useComputeServiceInfo } from '@/features/edge/proxy/backends/use-compute-service-info';
import { useMissingComputeWorkloads } from '@/resources/compute-workloads';
import type { HttpProxy } from '@/resources/http-proxies';
import { useMemo } from 'react';

export interface PoolBackends {
  /** More than one backend: no single workload or origin speaks for the ALB. */
  isPool: boolean;
  rows: BackendRow[];
  /** Weighted backends whose workload was deleted, so their share of requests fails. */
  unavailable: BackendRow[];
}

/**
 * Every backend in a multi-backend pool, with each workload backend checked
 * for a deleted workload. The proxy's workload label only names the workload
 * that publishes the ALB, so a pool is judged by its rows, not by that label.
 * Single-backend proxies return no rows and fetch nothing.
 */
export function usePoolBackends(
  projectId: string | undefined,
  proxy: HttpProxy | undefined
): PoolBackends {
  const backends = proxy?.backends;
  const isPool = (backends?.length ?? 0) > 1;
  const services = useComputeServiceInfo(
    projectId,
    isPool && (backends ?? []).some((backend) => backend.kind === 'networkService')
  );
  const workloadNames = useMemo(() => {
    if (!isPool) return [];
    const names = (backends ?? []).map((backend) =>
      backend.networkService?.name
        ? services.get(backend.networkService.name)?.workloadName
        : undefined
    );
    return [...new Set(names.filter((name): name is string => !!name))];
  }, [isPool, backends, services]);
  const missingWorkloads = useMissingComputeWorkloads(projectId ?? '', workloadNames);

  return useMemo(() => {
    const rows = isPool ? toBackendRows(backends, { services, missingWorkloads }) : [];
    return {
      isPool,
      rows,
      unavailable: rows.filter((row) => row.workloadMissing && !row.drained),
    };
  }, [isPool, backends, services, missingWorkloads]);
}
