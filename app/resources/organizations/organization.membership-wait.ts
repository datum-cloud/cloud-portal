import { isOrganizationOwnerGrantReady } from './organization.adapter';
import type { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@/modules/control-plane/resource-manager';
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
 * Poll a membership until its controller reports `RolesApplied`.
 *
 * Reads the membership status instead of SelfSubjectAccessReview on purpose.
 * A denied SAR during propagation seeds OpenFGA's 30s check-query cache, which
 * stretches the window where the user is locked out even after the
 * PolicyBindings are Ready.
 *
 * Applies to any member, not only owners. `fetchMembership` is injected so the
 * loop can be exercised without a control plane.
 */
export async function waitForMembershipRolesApplied(
  fetchMembership: () => Promise<Membership | undefined>,
  opts: MembershipWaitOptions = {}
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
  const postReadyDelayMs = opts.postReadyDelayMs ?? DEFAULT_POST_READY_DELAY_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const membership = await fetchMembership();
    if (membership && isOrganizationOwnerGrantReady(membership)) {
      if (postReadyDelayMs > 0) {
        await sleep(postReadyDelayMs);
      }
      return;
    }
    await sleep(intervalMs);
  }

  throw new AuthorizationError('Timed out waiting for organization roles to propagate');
}
