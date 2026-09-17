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
const LIST_PAGE_SIZE = 500;
const LIST_PAGE_CAP = 20;

/**
 * Read-only access to compute-exposed NetworkServices. The portal never
 * creates or edits these — the compute operator owns them — so the domain
 * type is the raw API resource.
 */
export function createNetworkServiceService() {
  return {
    /**
     * List every NetworkService in the project namespace. Follows
     * `metadata.continue` so ALBs whose service falls past the first page
     * still resolve a workload name.
     */
    async list(projectId: string): Promise<ComDatumapisNetworkingV1AlphaNetworkService[]> {
      const startTime = Date.now();

      try {
        const items: ComDatumapisNetworkingV1AlphaNetworkService[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < LIST_PAGE_CAP; page += 1) {
          const response = await listNetworkingDatumapisComV1AlphaNamespacedNetworkService({
            baseURL: getProjectScopedBase(projectId),
            path: { namespace: 'default' },
            query: { limit: LIST_PAGE_SIZE, ...(cursor ? { continue: cursor } : {}) },
          });
          const data = response.data as ComDatumapisNetworkingV1AlphaNetworkServiceList | undefined;
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
