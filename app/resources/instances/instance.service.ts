import { INSTANCE_LABELS, toInstance, toInstanceList } from './instance.adapter';
import type { Instance } from './instance.schema';
import {
  listComputeDatumapisComV1AlphaNamespacedInstance,
  readComputeDatumapisComV1AlphaNamespacedInstance,
  type ComDatumapisComputeV1AlphaInstance,
  type ComDatumapisComputeV1AlphaInstanceList,
} from '@/modules/control-plane/compute';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const instanceKeys = {
  all: ['instances'] as const,
  lists: () => [...instanceKeys.all, 'list'] as const,
  list: (projectId: string, workloadName?: string) =>
    [...instanceKeys.lists(), projectId, workloadName ?? 'all'] as const,
  details: () => [...instanceKeys.all, 'detail'] as const,
  detail: (projectId: string, instanceName: string) =>
    [...instanceKeys.details(), projectId, instanceName] as const,
};

const SERVICE_NAME = 'InstanceService';

/** Builds the labelSelector that scopes instances to a single workload. */
export function workloadInstancesSelector(workloadName: string): string {
  return `${INSTANCE_LABELS.workloadName}=${workloadName}`;
}

export function createInstanceService() {
  return {
    async listByWorkload(projectId: string, workloadName: string): Promise<Instance[]> {
      const startTime = Date.now();

      try {
        const baseURL = getProjectScopedBase(projectId);
        const path = { namespace: 'default' as const };

        const response = await listComputeDatumapisComV1AlphaNamespacedInstance({
          baseURL,
          path,
          query: { labelSelector: workloadInstancesSelector(workloadName) },
        });

        const data = response.data as ComDatumapisComputeV1AlphaInstanceList;

        logger.service(SERVICE_NAME, 'listByWorkload', {
          input: { projectId, workloadName },
          duration: Date.now() - startTime,
        });

        return toInstanceList(data?.items ?? []).items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listByWorkload failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(projectId: string, instanceName: string): Promise<Instance> {
      const startTime = Date.now();

      try {
        const baseURL = getProjectScopedBase(projectId);

        const response = await readComputeDatumapisComV1AlphaNamespacedInstance({
          baseURL,
          path: { namespace: 'default', name: instanceName },
        });

        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, instanceName },
          duration: Date.now() - startTime,
        });

        return toInstance(response.data as ComDatumapisComputeV1AlphaInstance);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type InstanceService = ReturnType<typeof createInstanceService>;
