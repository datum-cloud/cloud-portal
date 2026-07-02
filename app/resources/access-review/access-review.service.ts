import { toAccessReviewResult, toCreateAccessReviewPayload } from './access-review.adapter';
import type { AccessReviewResult, CreateAccessReviewInput } from './access-review.schema';
import {
  createAuthorizationV1SelfSubjectAccessReview,
  type IoK8sApiAuthorizationV1SelfSubjectAccessReview,
} from '@/modules/control-plane/authorization';
import { logger } from '@/modules/logger';
import type { ServiceOptions } from '@/resources/base/types';
import { getOrgScopedBase } from '@/resources/base/utils';
import { AuthorizationError } from '@/utils/errors';
import { mapApiError } from '@/utils/errors/error-mapper';

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
          baseURL: options?.baseURL ?? getOrgScopedBase(organizationId),
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

    /**
     * Poll until the current user is allowed to perform an action in an org
     * namespace, or until the timeout elapses.
     *
     * Use this before the first write to a freshly provisioned org. Firing a
     * create while the owner grant is still propagating returns 403 and, on our
     * OpenFGA deployment, poisons the 30s check-query cache — so blind POST
     * retries can sit denied for tens of seconds even after PolicyBinding is
     * Ready. Waiting on SelfSubjectAccessReview avoids seeding that cache with
     * early denials and lets the first create succeed as soon as the grant
     * lands.
     */
    async waitForPermission(
      organizationId: string,
      input: CreateAccessReviewInput,
      opts: {
        timeoutMs?: number;
        intervalMs?: number;
        operation?: string;
      } = {}
    ): Promise<void> {
      const timeoutMs = opts.timeoutMs ?? 90_000;
      const intervalMs = opts.intervalMs ?? 500;
      const operation = opts.operation ?? `${SERVICE_NAME}.waitForPermission`;
      const deadline = Date.now() + timeoutMs;
      const startTime = Date.now();

      while (Date.now() < deadline) {
        if (await this.hasPermission(organizationId, input)) {
          logger.service(SERVICE_NAME, operation, {
            input: { organizationId, resource: input.resource, verb: input.verb },
            duration: Date.now() - startTime,
          });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }

      throw new AuthorizationError(
        `Timed out waiting for ${input.verb} permission on ${input.group}/${input.resource} in ${input.namespace}`
      );
    },
  };
}

export type AccessReviewService = ReturnType<typeof createAccessReviewService>;
