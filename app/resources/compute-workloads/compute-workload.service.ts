import {
  readComputeDatumapisComV1AlphaNamespacedWorkload,
  type ComDatumapisComputeV1AlphaWorkload,
} from '@/modules/control-plane/compute';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const computeWorkloadKeys = {
  all: ['compute-workloads'] as const,
  details: () => [...computeWorkloadKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) =>
    [...computeWorkloadKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'ComputeWorkloadService';

/**
 * Read-only access to compute Workloads. The compute plugin owns the workload
 * UI; the portal only needs to know whether a workload an ALB points at still
 * exists, so the domain type is the raw API resource.
 */
export function createComputeWorkloadService() {
  return {
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
