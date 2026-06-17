import { toServiceEntitlement } from './service-entitlement.adapter';
import type { ServiceEntitlement } from './service-entitlement.schema';
import { client } from '@/modules/control-plane/shared/client.gen';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

const SERVICE_NAME = 'ServiceEntitlementService';

export function createServiceEntitlementService() {
  return {
    async list(projectId: string): Promise<ServiceEntitlement[]> {
      const startTime = Date.now();
      try {
        const response = await client.get({
          baseURL: getProjectScopedBase(projectId),
          url: '/apis/services.miloapis.com/v1alpha1/serviceentitlements',
        });
        const data = response.data as { items?: unknown[] };
        const items = (data.items ?? []).map((item) =>
          toServiceEntitlement(item as Parameters<typeof toServiceEntitlement>[0])
        );
        logger.service(SERVICE_NAME, 'list', {
          input: { projectId },
          duration: Date.now() - startTime,
        });
        return items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async getComputeEntitlement(projectId: string): Promise<ServiceEntitlement | null> {
      try {
        const entitlements = await this.list(projectId);
        return entitlements.find((e) => e.name === 'compute') ?? null;
      } catch {
        return null;
      }
    },

    async create(projectId: string, serviceName: string): Promise<ServiceEntitlement> {
      try {
        const response = await client.post({
          baseURL: getProjectScopedBase(projectId),
          url: '/apis/services.miloapis.com/v1alpha1/serviceentitlements',
          body: {
            apiVersion: 'services.miloapis.com/v1alpha1',
            kind: 'ServiceEntitlement',
            metadata: { name: serviceName },
            spec: { serviceRef: { name: serviceName } },
          },
        });
        return toServiceEntitlement(response.data as Parameters<typeof toServiceEntitlement>[0]);
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}
