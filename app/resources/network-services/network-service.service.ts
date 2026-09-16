import { toNetworkService, toNetworkServiceList } from './network-service.adapter';
import type { NetworkService } from './network-service.schema';
import {
  listNetworkingDatumapisComV1AlphaNamespacedNetworkService,
  readNetworkingDatumapisComV1AlphaNamespacedNetworkService,
  type ComDatumapisNetworkingV1AlphaNetworkService,
  type ComDatumapisNetworkingV1AlphaNetworkServiceList,
  type ListNetworkingDatumapisComV1AlphaNamespacedNetworkServiceData,
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
 * Read-only surface. The portal references NetworkServices as HTTPProxy
 * backends but never creates or edits one — the alb plugin verifies a service
 * exists and never creates it either, and the same rule applies here.
 */
export function createNetworkServiceService() {
  return {
    async list(
      projectId: string,
      query?: ListNetworkingDatumapisComV1AlphaNamespacedNetworkServiceData['query']
    ): Promise<NetworkService[]> {
      const startTime = Date.now();

      try {
        const response = await listNetworkingDatumapisComV1AlphaNamespacedNetworkService({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' as const },
          query,
        });

        const data = response.data as ComDatumapisNetworkingV1AlphaNetworkServiceList;

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId },
          duration: Date.now() - startTime,
        });

        return toNetworkServiceList(data?.items ?? []).items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async get(projectId: string, name: string): Promise<NetworkService> {
      const startTime = Date.now();

      try {
        const response = await readNetworkingDatumapisComV1AlphaNamespacedNetworkService({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' as const, name },
        });

        const data = response.data as ComDatumapisNetworkingV1AlphaNetworkService;

        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return toNetworkService(data);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type NetworkServiceService = ReturnType<typeof createNetworkServiceService>;
