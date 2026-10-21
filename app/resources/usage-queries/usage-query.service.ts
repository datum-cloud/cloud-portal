import {
  createUsageBillingMiloapisComV1Alpha1UsageQuery,
  type ComMiloapisGoBillingApiUsageV1Alpha1UsageQuerySpec,
  type ComMiloapisGoBillingApiUsageV1Alpha1UsageQueryStatus,
} from '@/modules/control-plane/usage';
import { logger } from '@/modules/logger';
import { getOrgScopedBase, getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export type UsageQuerySpec = ComMiloapisGoBillingApiUsageV1Alpha1UsageQuerySpec;
export type UsageQueryStatus = ComMiloapisGoBillingApiUsageV1Alpha1UsageQueryStatus;

/**
 * Where a query is made. The context, not the spec, decides what it can
 * read: an organization sees all of its billing accounts, a project only
 * its own usage. The spec can only narrow that.
 */
export type UsageQueryScope =
  { type: 'organization'; orgId: string } | { type: 'project'; projectId: string };

function scopedBase(scope: UsageQueryScope): string {
  return scope.type === 'organization'
    ? getOrgScopedBase(scope.orgId)
    : getProjectScopedBase(scope.projectId);
}

const SERVICE_NAME = 'UsageQueryService';

/**
 * `UsageQuery` (`usage.billing.miloapis.com`) is create-only and never
 * stored, like a `TokenReview`: POST one and read the results off the
 * returned `status`.
 */
export function createUsageQueryService() {
  return {
    async query(scope: UsageQueryScope, spec: UsageQuerySpec): Promise<UsageQueryStatus> {
      const startTime = Date.now();
      try {
        const resp = await createUsageBillingMiloapisComV1Alpha1UsageQuery({
          baseURL: scopedBase(scope),
          // The generated SDK sends `*/*`; the API server wants JSON.
          headers: { 'Content-Type': 'application/json' },
          body: {
            apiVersion: 'usage.billing.miloapis.com/v1alpha1',
            kind: 'UsageQuery',
            spec,
          },
        });
        logger.service(SERVICE_NAME, 'query', {
          input: { scope, meters: spec.meters?.length ?? 0 },
          duration: Date.now() - startTime,
        });
        return resp.data?.status ?? {};
      } catch (error) {
        logger.error(`${SERVICE_NAME}.query failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type UsageQueryService = ReturnType<typeof createUsageQueryService>;
