import {
  listNetworkingDatumapisComV1AlphaNamespacedNetwork,
  type ComDatumapisNetworkingV1AlphaNetwork,
  type ComDatumapisNetworkingV1AlphaNetworkList,
} from '@/modules/control-plane/networking';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const networkKeys = {
  all: ['networks'] as const,
  lists: () => [...networkKeys.all, 'list'] as const,
  list: (projectId: string) => [...networkKeys.lists(), projectId] as const,
};

const SERVICE_NAME = 'NetworksService';
const LIST_PAGE_SIZE = 500;
const LIST_PAGE_CAP = 20;

/**
 * Read-only access to VPC Networks. The Networks plugin owns creating and
 * editing them; the portal only needs to know which exist and whether they
 * are ready, so the domain type is the raw API resource.
 */
export function createNetworksService() {
  return {
    /** List every Network in the project namespace, following `metadata.continue`. */
    async list(projectId: string): Promise<ComDatumapisNetworkingV1AlphaNetwork[]> {
      const startTime = Date.now();

      try {
        const items: ComDatumapisNetworkingV1AlphaNetwork[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < LIST_PAGE_CAP; page += 1) {
          const response = await listNetworkingDatumapisComV1AlphaNamespacedNetwork({
            baseURL: getProjectScopedBase(projectId),
            path: { namespace: 'default' },
            query: { limit: LIST_PAGE_SIZE, ...(cursor ? { continue: cursor } : {}) },
          });
          const data = response.data as ComDatumapisNetworkingV1AlphaNetworkList | undefined;
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
  };
}

export type NetworksService = ReturnType<typeof createNetworksService>;
