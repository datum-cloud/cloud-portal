import type { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@/modules/control-plane/resource-manager';
import { logger } from '@/modules/logger';
import { createOrganizationService } from '@/resources/organizations';
import { isMembershipRolesApplied } from '@/resources/organizations/organization.adapter';
import { AuthorizationError } from '@/utils/errors';

type Membership = ComMiloapisResourcemanagerV1Alpha1OrganizationMembership;

export interface MembershipWaitOptions {
  timeoutMs?: number;
  intervalMs?: number;
  /** Pause after RolesApplied before returning. Avoids the first auth check racing OpenFGA replica sync. */
  postReadyDelayMs?: number;
}

const DEFAULT_TIMEOUT_MS = 90_000;
const DEFAULT_INTERVAL_MS = 500;
const DEFAULT_POST_READY_DELAY_MS = 2_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll the signed-in user's membership of `orgId` until its controller reports
 * `RolesApplied`, meaning the PolicyBindings and OpenFGA tuples exist.
 *
 * Reads membership status instead of SelfSubjectAccessReview on purpose. A
 * denied SAR during propagation seeds OpenFGA's 30s check-query cache, which
 * stretches the window where the user is locked out even after the bindings
 * are Ready. Applies to any member: new owners during onboarding and invitees
 * who just accepted.
 *
 * `fetchMembership` is injectable so the loop can be exercised without a
 * control plane.
 */
export async function waitForMembershipRolesApplied(
  orgId: string,
  opts: MembershipWaitOptions = {},
  fetchMembership: () => Promise<Membership | undefined> = () =>
    createOrganizationService().fetchMembershipForOrganization(orgId)
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
  const postReadyDelayMs = opts.postReadyDelayMs ?? DEFAULT_POST_READY_DELAY_MS;
  const startTime = Date.now();
  const deadline = startTime + timeoutMs;

  while (Date.now() < deadline) {
    let membership: Membership | undefined;
    try {
      membership = await fetchMembership();
    } catch (error) {
      // A transient read failure should not abort the wait; keep polling.
      logger.warn(`Membership poll failed for ${orgId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (membership && isMembershipRolesApplied(membership)) {
      if (postReadyDelayMs > 0) {
        await sleep(postReadyDelayMs);
      }
      logger.service('MemberAccess', 'waitForMembershipRolesApplied', {
        input: { orgId },
        duration: Date.now() - startTime,
      });
      return;
    }
    await sleep(intervalMs);
  }

  throw new AuthorizationError(`Timed out waiting for roles to propagate on organization ${orgId}`);
}
