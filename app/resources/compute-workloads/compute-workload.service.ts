import {
  listComputeDatumapisComV1AlphaNamespacedWorkload,
  readComputeDatumapisComV1AlphaNamespacedWorkload,
  type ComDatumapisComputeV1AlphaWorkload,
  type ComDatumapisComputeV1AlphaWorkloadList,
} from '@/modules/control-plane/compute';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const computeWorkloadKeys = {
  all: ['compute-workloads'] as const,
  lists: () => [...computeWorkloadKeys.all, 'list'] as const,
  list: (projectId: string) => [...computeWorkloadKeys.lists(), projectId] as const,
  details: () => [...computeWorkloadKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) =>
    [...computeWorkloadKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'ComputeWorkloadService';
const LIST_PAGE_SIZE = 500;
const LIST_PAGE_CAP = 20;

/**
 * Read-only access to compute Workloads. The compute plugin owns the workload
 * UI; the portal only needs to know whether a workload an ALB points at still
 * exists, and how far the home page's setup has got, so the domain type is the
 * raw API resource.
 */
export function createComputeWorkloadService() {
  return {
    /** List every Workload in the project namespace, following `metadata.continue`. */
    async list(projectId: string): Promise<ComDatumapisComputeV1AlphaWorkload[]> {
      const startTime = Date.now();

      try {
        const items: ComDatumapisComputeV1AlphaWorkload[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < LIST_PAGE_CAP; page += 1) {
          const response = await listComputeDatumapisComV1AlphaNamespacedWorkload({
            baseURL: getProjectScopedBase(projectId),
            path: { namespace: 'default' },
            query: { limit: LIST_PAGE_SIZE, ...(cursor ? { continue: cursor } : {}) },
          });
          const data = response.data as ComDatumapisComputeV1AlphaWorkloadList | undefined;
          items.push(...(data?.items ?? []));
          cursor = data?.metadata?.continue || undefined;
          if (!cursor) break;
        }

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId, count: items.length, truncated: Boolean(cursor) },
          duration: Date.now() - startTime,
        });

        return items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(projectId: string, name: string): Promise<ComDatumapisComputeV1AlphaWorkload> {
      const startTime = Date.now();

      try {
        const response = await readComputeDatumapisComV1AlphaNamespacedWorkload({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
        });

        const data = response.data as ComDatumapisComputeV1AlphaWorkload;

        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return data;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type ComputeWorkloadService = ReturnType<typeof createComputeWorkloadService>;
