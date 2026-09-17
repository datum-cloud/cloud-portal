import {
  listNetworkingDatumapisComV1AlphaNamespacedNetworkService,
  readNetworkingDatumapisComV1AlphaNamespacedNetworkService,
  type ComDatumapisNetworkingV1AlphaNetworkService,
  type ComDatumapisNetworkingV1AlphaNetworkServiceList,
} from '@/modules/control-plane/networking';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const networkServiceKeys = {
  all: ['network-services'] as const,
  lists: () => [...networkServiceKeys.all, 'list'] as const,
  list: (projectId: string) => [...networkServiceKeys.lists(), projectId] as const,
  details: () => [...networkServiceKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) =>
    [...networkServiceKeys.details(), projectId, name] as const,
};

const SERVICE_NAME = 'NetworkServiceService';

/**
 * Read-only access to compute-exposed NetworkServices. The portal never
 * creates or edits these — the compute operator owns them — so the domain
 * type is the raw API resource.
 */
export function createNetworkServiceService() {
  return {
    async list(projectId: string): Promise<ComDatumapisNetworkingV1AlphaNetworkService[]> {
      const startTime = Date.now();

      try {
        const response = await listNetworkingDatumapisComV1AlphaNamespacedNetworkService({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
        });

        const data = response.data as ComDatumapisNetworkingV1AlphaNetworkServiceList | undefined;

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId },
          duration: Date.now() - startTime,
        });

        return data?.items ?? [];
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(
      projectId: string,
      name: string
    ): Promise<ComDatumapisNetworkingV1AlphaNetworkService> {
      const startTime = Date.now();

      try {
        const response = await readNetworkingDatumapisComV1AlphaNamespacedNetworkService({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
        });

        const data = response.data as ComDatumapisNetworkingV1AlphaNetworkService;

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

export type NetworkServiceService = ReturnType<typeof createNetworkServiceService>;
