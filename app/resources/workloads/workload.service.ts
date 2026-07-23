import { toWorkload, toWorkloadList } from './workload.adapter';
import type { Workload } from './workload.schema';
import {
  createComputeDatumapisComV1AlphaNamespacedWorkload,
  listComputeDatumapisComV1AlphaNamespacedWorkload,
  readComputeDatumapisComV1AlphaNamespacedWorkload,
  type ComDatumapisComputeV1AlphaWorkload,
  type ComDatumapisComputeV1AlphaWorkloadList,
  type ListComputeDatumapisComV1AlphaNamespacedWorkloadData,
} from '@/modules/control-plane/compute';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const workloadKeys = {
  all: ['workloads'] as const,
  lists: () => [...workloadKeys.all, 'list'] as const,
  list: (projectId: string) => [...workloadKeys.lists(), projectId] as const,
  details: () => [...workloadKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) =>
    [...workloadKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'WorkloadService';

export function createWorkloadService() {
  return {
    async list(
      projectId: string,
      query?: ListComputeDatumapisComV1AlphaNamespacedWorkloadData['query']
    ): Promise<Workload[]> {
      const startTime = Date.now();

      try {
        const baseURL = getProjectScopedBase(projectId);
        const path = { namespace: 'default' as const };

        const response = await listComputeDatumapisComV1AlphaNamespacedWorkload({
          baseURL,
          path,
          query,
        });

        const data = response.data as ComDatumapisComputeV1AlphaWorkloadList;

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId },
          duration: Date.now() - startTime,
        });

        return toWorkloadList(data?.items ?? []).items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(projectId: string, name: string): Promise<Workload> {
      const startTime = Date.now();

      try {
        const baseURL = getProjectScopedBase(projectId);
        const path = { namespace: 'default' as const, name };

        const response = await readComputeDatumapisComV1AlphaNamespacedWorkload({
          baseURL,
          path,
        });

        const data = response.data as ComDatumapisComputeV1AlphaWorkload;

        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return toWorkload(data);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async create(
      projectId: string,
      payload: ComDatumapisComputeV1AlphaWorkload
    ): Promise<Workload> {
      const startTime = Date.now();

      try {
        const baseURL = getProjectScopedBase(projectId);

        const response = await createComputeDatumapisComV1AlphaNamespacedWorkload({
          baseURL,
          path: { namespace: 'default' as const },
          body: payload,
        });

        const data = response.data as ComDatumapisComputeV1AlphaWorkload;

        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, name: payload.metadata?.name },
          duration: Date.now() - startTime,
        });

        return toWorkload(data);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type WorkloadService = ReturnType<typeof createWorkloadService>;
