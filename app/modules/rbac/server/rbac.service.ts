import { logger } from '@/modules/logger';
import { createAccessReviewService, type SupportedVerb } from '@/resources/access-review';
import { getOrgScopedBase, getProjectScopedBase, getUserScopedBase } from '@/resources/base/utils';

/**
 * Scope determines which control-plane base the SelfSubjectAccessReview is
 * posted to. User/root-scoped resources (e.g. `organizations`) only return an
 * opinion at the user control-plane, while org/project resources live under
 * their respective scoped bases.
 */
export type PermissionCheckScope = 'org' | 'user' | 'project';

interface PermissionCheckInput {
  resource: string;
  verb: SupportedVerb;
  group?: string;
  namespace?: string;
  name?: string;
  scope?: PermissionCheckScope;
  projectId?: string;
}

export interface PermissionResult {
  allowed: boolean;
  denied: boolean;
  reason?: string;
}

interface PermissionRequest {
  resource: string;
  verb: SupportedVerb;
  group: string;
  namespace?: string;
  name?: string;
}

export interface BulkPermissionResult extends PermissionResult {
  request: PermissionRequest;
}

type AccessReviewFactory = typeof createAccessReviewService;

export class RbacService {
  constructor(
    private readonly accessReviewFactory: AccessReviewFactory = createAccessReviewService
  ) {}

  /**
   * Resolve the control-plane base URL for a check based on its scope.
   * Defaults to the org-scoped base to preserve existing caller behavior.
   */
  private resolveBaseURL(organizationId: string, check: PermissionCheckInput): string {
    switch (check.scope ?? 'org') {
      case 'user':
        return getUserScopedBase();
      case 'project':
        if (!check.projectId) {
          throw new Error('projectId is required for project-scoped permission checks');
        }
        return getProjectScopedBase(check.projectId);
      case 'org':
      default:
        return getOrgScopedBase(organizationId);
    }
  }

  async checkPermission(
    organizationId: string,
    check: PermissionCheckInput
  ): Promise<PermissionResult> {
    const accessReview = this.accessReviewFactory();
    try {
      const result = await accessReview.create(
        organizationId,
        {
          namespace: check.namespace || '',
          verb: check.verb,
          group: check.group || '',
          resource: check.resource,
          name: check.name,
        },
        { baseURL: this.resolveBaseURL(organizationId, check) }
      );
      return {
        allowed: 'allowed' in result ? result.allowed : false,
        denied: 'denied' in result ? result.denied : true,
        reason: undefined,
      };
    } catch (error) {
      logger.error('[RbacService] checkPermission failed', error as Error);
      return {
        allowed: false,
        denied: true,
        reason: error instanceof Error ? error.message : 'Permission check failed',
      };
    }
  }

  /**
   * Check multiple permissions in parallel. Each check uses the same
   * scope-aware base resolution as {@link checkPermission}. Results include
   * the originating request so the client can match them up.
   */
  async checkPermissions(
    organizationId: string,
    checks: PermissionCheckInput[]
  ): Promise<BulkPermissionResult[]> {
    const accessReview = this.accessReviewFactory();

    const settled = await Promise.allSettled(
      checks.map(async (check) => {
        const result = await accessReview.create(
          organizationId,
          {
            namespace: check.namespace || '',
            verb: check.verb,
            group: check.group || '',
            resource: check.resource,
            name: check.name,
          },
          { baseURL: this.resolveBaseURL(organizationId, check) }
        );
        return {
          allowed: 'allowed' in result ? result.allowed : false,
          denied: 'denied' in result ? result.denied : true,
          reason: undefined,
        };
      })
    );

    return settled.map((outcome, index) => {
      const check = checks[index];
      const request: PermissionRequest = {
        resource: check.resource,
        verb: check.verb,
        group: check.group || '',
        namespace: check.namespace,
        name: check.name,
      };
      if (outcome.status === 'fulfilled') {
        return { ...outcome.value, request };
      }
      logger.error('[RbacService] checkPermissions item failed', outcome.reason as Error);
      return {
        allowed: false,
        denied: true,
        reason:
          outcome.reason instanceof Error ? outcome.reason.message : 'Permission check failed',
        request,
      };
    });
  }
}
