import { createProjectService } from './project.service';
import { inspectProjectReady } from './project.watch';
import { logger } from '@/modules/logger';
import { createOrganizationService } from '@/resources/organizations';
import { isOrganizationOwnerGrantReady } from '@/resources/organizations/organization.adapter';
import { createPolicyBindingService } from '@/resources/policy-bindings';
import type { PolicyBinding } from '@/resources/policy-bindings/policy-binding.schema';
import { AuthorizationError } from '@/utils/errors';

function isPolicyBindingReady(binding: PolicyBinding): boolean {
  const conditions = binding.status?.conditions as
    Array<{ type?: string; status?: string }> | undefined;
  return (
    conditions?.some((condition) => condition.type === 'Ready' && condition.status === 'True') ??
    false
  );
}

export function policyBindingTargetsProject(binding: PolicyBinding, projectId: string): boolean {
  const ref = binding.resourceSelector?.resourceRef;
  if (!ref?.name) {
    return false;
  }
  return ref.name === projectId && ref.kind?.toLowerCase() === 'project';
}

export function findReadyProjectPolicyBinding(
  bindings: PolicyBinding[],
  projectId: string
): PolicyBinding | undefined {
  return bindings.find(
    (binding) => policyBindingTargetsProject(binding, projectId) && isPolicyBindingReady(binding)
  );
}

export function isProjectAccessGrantReady(
  bindings: PolicyBinding[],
  projectId: string,
  membershipReady: boolean
): boolean {
  if (!membershipReady) {
    return false;
  }
  return findReadyProjectPolicyBinding(bindings, projectId) !== undefined;
}

/**
 * Wait until cluster-scoped project access is likely safe without polling
 * `projects.get` / SAR during FGA propagation.
 *
 * Uses org-scoped project list (no cluster FGA), OrganizationMembership
 * `RolesApplied`, and a Ready PolicyBinding targeting the project in the org
 * namespace — the same pipeline as {@link createOrganizationService.waitForOwnerGrantReady}.
 */
export async function waitForProjectAccessReady(
  orgId: string,
  projectId: string,
  opts: {
    timeoutMs?: number;
    intervalMs?: number;
    /** Pause after grant signals before returning — mirrors owner-grant wait. */
    postReadyDelayMs?: number;
  } = {}
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 90_000;
  const intervalMs = opts.intervalMs ?? 500;
  const postReadyDelayMs = opts.postReadyDelayMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;
  const startTime = Date.now();

  const orgService = createOrganizationService();
  const projectService = createProjectService();
  const policyBindingService = createPolicyBindingService();

  while (Date.now() < deadline) {
    try {
      const list = await projectService.listAll(orgId);
      const project = list.items.find((item) => item.name === projectId);
      if (!project || inspectProjectReady(project) === 'pending') {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        continue;
      }

      const membership = await orgService.fetchMembershipForOrganization(orgId);
      if (!membership || !isOrganizationOwnerGrantReady(membership)) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        continue;
      }

      let bindings: PolicyBinding[] = [];
      try {
        bindings = await policyBindingService.list(orgId);
      } catch (error) {
        logger.warn(`Could not list policy bindings for ${orgId} during project access wait`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (isProjectAccessGrantReady(bindings, projectId, true)) {
        if (postReadyDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, postReadyDelayMs));
        }
        logger.service('ProjectAccess', 'waitForProjectAccessReady', {
          input: { orgId, projectId },
          duration: Date.now() - startTime,
        });
        return;
      }
    } catch (error) {
      logger.warn(`Project access wait poll failed for ${projectId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new AuthorizationError(
    `Timed out waiting for project access to propagate on project ${projectId}`
  );
}
