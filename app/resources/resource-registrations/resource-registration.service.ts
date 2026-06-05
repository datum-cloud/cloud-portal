import { toResourceRegistration } from './resource-registration.adapter';
import type { ResourceRegistration } from './resource-registration.schema';
import {
  listQuotaMiloapisComV1Alpha1ResourceRegistration,
  type ComMiloapisQuotaV1Alpha1ResourceRegistrationList,
} from '@/modules/control-plane/quota';
import { logger } from '@/modules/logger';
import { getOrgScopedBase, getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const resourceRegistrationKeys = {
  all: ['resource-registrations'] as const,
  lists: () => [...resourceRegistrationKeys.all, 'list'] as const,
  list: (scope: 'organization' | 'project', id: string) =>
    [...resourceRegistrationKeys.lists(), scope, id] as const,
};

const SERVICE_NAME = 'ResourceRegistrationService';

/**
 * Cluster-scoped reads for milo `ResourceRegistration`. The portal
 * pairs these with `AllowanceBucket` listings on the Quotas page so
 * each bucket's `resourceType` can be classified as
 * Entity / Allocation / Feature — Feature buckets render differently
 * from countable resources (no "X/Y used" bar).
 *
 * The scope arg picks which milo apiserver baseURL to talk to so the
 * caller doesn't have to remember which side owns these registrations.
 */
export function createResourceRegistrationService() {
  const getScopedBase = (scope: 'organization' | 'project', id: string) =>
    scope === 'organization' ? getOrgScopedBase(id) : getProjectScopedBase(id);

  return {
    async list(scope: 'organization' | 'project', id: string): Promise<ResourceRegistration[]> {
      const startTime = Date.now();
      try {
        const response = await listQuotaMiloapisComV1Alpha1ResourceRegistration({
          baseURL: getScopedBase(scope, id),
        });
        const data = response.data as ComMiloapisQuotaV1Alpha1ResourceRegistrationList;
        const items = data.items?.map(toResourceRegistration) ?? [];
        logger.service(SERVICE_NAME, 'list', {
          input: { scope, id },
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

export type ResourceRegistrationService = ReturnType<typeof createResourceRegistrationService>;
