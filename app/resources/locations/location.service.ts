import { toLocationList } from './location.adapter';
import type { Location } from './location.schema';
import {
  listLocationsMiloapisComV1Alpha1Location,
  type ComMiloapisLocationsV1Alpha1LocationList,
} from '@/modules/control-plane/locations';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { AuthorizationError, NotFoundError } from '@/utils/errors';
import { mapApiError } from '@/utils/errors/error-mapper';

export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: (projectId: string) => [...locationKeys.lists(), projectId] as const,
};

const SERVICE_NAME = 'LocationService';

/**
 * Cluster-scoped Location catalog as projected into a project control plane.
 * List failures (missing IAM, API not offered yet) degrade to an empty list
 * so callers can fall back to local region metadata.
 */
export function createLocationService() {
  return {
    async list(projectId: string): Promise<Location[]> {
      const startTime = Date.now();

      try {
        const response = await listLocationsMiloapisComV1Alpha1Location({
          baseURL: getProjectScopedBase(projectId),
        });
        const data = response.data as ComMiloapisLocationsV1Alpha1LocationList;
        const items = toLocationList(data?.items ?? []);

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId, count: items.length },
          duration: Date.now() - startTime,
        });

        return items;
      } catch (error) {
        const mapped = mapApiError(error);
        if (mapped instanceof AuthorizationError || mapped instanceof NotFoundError) {
          logger.warn(`${SERVICE_NAME}.list degraded`, {
            projectId,
            status: mapped.status,
          });
          return [];
        }
        logger.error(`${SERVICE_NAME}.list failed`, mapped);
        return [];
      }
    },
  };
}

export type LocationService = ReturnType<typeof createLocationService>;
