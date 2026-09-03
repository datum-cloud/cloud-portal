import {
  findEntitlementForService,
  toCreateServiceEntitlementPayload,
} from './service-entitlement.adapter';
import { NETWORKING_SERVICE, type ServiceEntitlement } from './service-entitlement.schema';
import {
  createServicesMiloapisComV1Alpha1ServiceEntitlement,
  listServicesMiloapisComV1Alpha1ServiceEntitlement,
  type ComMiloapisServicesV1Alpha1ServiceEntitlementList,
} from '@/modules/control-plane/services';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { ConflictError } from '@/utils/errors';
import { mapApiError } from '@/utils/errors/error-mapper';

export const serviceEntitlementKeys = {
  all: ['service-entitlements'] as const,
  active: (projectId: string) => [...serviceEntitlementKeys.all, 'active', projectId] as const,
};

const SERVICE_NAME = 'ServiceEntitlementService';

export function createServiceEntitlementService() {
  return {
    async list(projectId: string): Promise<ServiceEntitlement[]> {
      const startTime = Date.now();
      try {
        const response = await listServicesMiloapisComV1Alpha1ServiceEntitlement({
          baseURL: getProjectScopedBase(projectId),
          query: { limit: 500 },
        });
        const data = response.data as ComMiloapisServicesV1Alpha1ServiceEntitlementList | undefined;
        const items = data?.items ?? [];
        logger.service(SERVICE_NAME, 'list', {
          input: { projectId, count: items.length },
          duration: Date.now() - startTime,
        });
        return items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Create a ServiceEntitlement when the project does not already have one
     * for the service. Existing entitlements (any phase) are left alone.
     *
     * `serviceRefName` is the Service object's metadata.name. Matching also
     * accepts the canonical `serviceName` stamped on status.
     */
    async ensure(
      projectId: string,
      service: { serviceName: string; serviceRefName: string } = NETWORKING_SERVICE
    ): Promise<ServiceEntitlement | undefined> {
      const startTime = Date.now();
      const matchIds = [service.serviceName, service.serviceRefName];
      const existing = findEntitlementForService(await this.list(projectId), matchIds);
      if (existing) {
        logger.service(SERVICE_NAME, 'ensure', {
          input: { projectId, serviceRefName: service.serviceRefName, created: false },
          duration: Date.now() - startTime,
        });
        return existing;
      }

      try {
        const response = await createServicesMiloapisComV1Alpha1ServiceEntitlement({
          baseURL: getProjectScopedBase(projectId),
          body: toCreateServiceEntitlementPayload(projectId, service.serviceRefName),
          headers: { 'Content-Type': 'application/json' },
        });
        const created = response.data as ServiceEntitlement | undefined;
        logger.service(SERVICE_NAME, 'ensure', {
          input: { projectId, serviceRefName: service.serviceRefName, created: true },
          duration: Date.now() - startTime,
        });
        return created;
      } catch (error) {
        const mapped = mapApiError(error);
        if (mapped instanceof ConflictError) {
          logger.service(SERVICE_NAME, 'ensure', {
            input: {
              projectId,
              serviceRefName: service.serviceRefName,
              created: false,
              conflict: true,
            },
            duration: Date.now() - startTime,
          });
          return findEntitlementForService(await this.list(projectId), matchIds);
        }
        logger.error(`${SERVICE_NAME}.ensure failed`, mapped);
        throw mapped;
      }
    },
  };
}

export type ServiceEntitlementService = ReturnType<typeof createServiceEntitlementService>;
