import { toAccessReviewResult, toCreateAccessReviewPayload } from './access-review.adapter';
import type { AccessReviewResult, CreateAccessReviewInput } from './access-review.schema';
import {
  createAuthorizationV1SelfSubjectAccessReview,
  type IoK8sApiAuthorizationV1SelfSubjectAccessReview,
} from '@/modules/control-plane/authorization';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { mapApiError } from '@/utils/errors/error-mapper';
import { getOrgScopedBase } from '@/utils/scoped-urls';

const SERVICE_NAME = 'AccessReviewService';

export function createAccessReviewService() {
  return {
    /**
     * Create a self subject access review to check permissions
     */
    async create(
      organizationId: string,
      input: CreateAccessReviewInput,
      options?: ServiceOptions
    ): Promise<AccessReviewResult | IoK8sApiAuthorizationV1SelfSubjectAccessReview> {
      const startTime = Date.now();

      try {
        const payload = toCreateAccessReviewPayload(input);

        const response = await createAuthorizationV1SelfSubjectAccessReview({
          baseURL: getOrgScopedBase(organizationId),
          query: {
            dryRun: options?.dryRun ? 'All' : undefined,
          },
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload,
        });

        const data = response.data as IoK8sApiAuthorizationV1SelfSubjectAccessReview;

        // Return raw response for dryRun
        if (options?.dryRun) {
          return data;
        }

        const result = toAccessReviewResult(data);

        logger.service(SERVICE_NAME, 'create', {
          input: { organizationId, resource: input.resource, verb: input.verb },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Check if current user has permission for a specific action
     */
    async hasPermission(organizationId: string, input: CreateAccessReviewInput): Promise<boolean> {
      try {
        const result = await this.create(organizationId, input);
        return 'allowed' in result ? result.allowed : false;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.hasPermission failed`, error as Error);
        return false;
      }
    },
  };
}

export type AccessReviewService = ReturnType<typeof createAccessReviewService>;
