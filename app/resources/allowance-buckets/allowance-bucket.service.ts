import { toAllowanceBucket } from './allowance-bucket.adapter';
import type { AllowanceBucket } from './allowance-bucket.schema';
import {
  listQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket,
  type ComMiloapisQuotaV1Alpha1AllowanceBucketList,
} from '@/modules/control-plane/quota';
import { logger } from '@/modules/logger';
import type { ServiceContext, ServiceOptions } from '@/resources/base/types';
import { buildNamespace } from '@/utils/common';
import { mapApiError } from '@/utils/errors/error-mapper';

export const allowanceBucketKeys = {
  all: ['allowance-buckets'] as const,
  lists: () => [...allowanceBucketKeys.all, 'list'] as const,
  list: (namespace: string, id: string) => [...allowanceBucketKeys.lists(), namespace, id] as const,
};

const SERVICE_NAME = 'AllowanceBucketService';

export function createAllowanceBucketService(ctx: ServiceContext) {
  const client = ctx.controlPlaneClient;

  const buildBaseUrl = (namespace: 'organization' | 'project', id: string) =>
    `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1/${namespace}s/${id}/control-plane`;

  return {
    /**
     * List all allowance buckets for an organization or project
     */
    async list(
      namespace: 'organization' | 'project',
      id: string,
      _options?: ServiceOptions
    ): Promise<AllowanceBucket[]> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(namespace, id);

        logger.service(SERVICE_NAME, 'list', {
          input: { namespace, id },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error, ctx.requestId);
      }
    },

    async fetchList(namespace: 'organization' | 'project', id: string): Promise<AllowanceBucket[]> {
      const response = await listQuotaMiloapisComV1Alpha1NamespacedAllowanceBucket({
        client,
        baseURL: buildBaseUrl(namespace, id),
        path: {
          namespace: buildNamespace(namespace, id),
        },
      });

      const data = response.data as ComMiloapisQuotaV1Alpha1AllowanceBucketList;
      return data.items?.map(toAllowanceBucket) ?? [];
    },
  };
}

export type AllowanceBucketService = ReturnType<typeof createAllowanceBucketService>;
