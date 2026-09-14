import { waitForMembershipRolesApplied } from './member-access';
import type { ComMiloapisResourcemanagerV1Alpha1OrganizationMembership } from '@/modules/control-plane/resource-manager';
import { AuthorizationError } from '@/utils/errors';
import { describe, expect, it } from 'bun:test';

type Membership = ComMiloapisResourcemanagerV1Alpha1OrganizationMembership;

const ready = {
  status: { conditions: [{ type: 'RolesApplied', status: 'True' }] },
} as unknown as Membership;

const pending = {
  status: { conditions: [{ type: 'RolesApplied', status: 'False' }] },
} as unknown as Membership;

const fast = { intervalMs: 1, postReadyDelayMs: 0, timeoutMs: 200 };

describe('waitForMembershipRolesApplied', () => {
  it('returns as soon as the membership reports RolesApplied', async () => {
    let calls = 0;
    await waitForMembershipRolesApplied('acme', fast, async () => {
      calls += 1;
      return ready;
    });
    expect(calls).toBe(1);
  });

  it('keeps polling while the membership is missing or pending, then resolves', async () => {
    const responses: (Membership | undefined)[] = [undefined, pending, ready];
    let calls = 0;
    await waitForMembershipRolesApplied('acme', fast, async () => {
      const next = calls < responses.length ? responses[calls] : ready;
      calls += 1;
      return next;
    });
    expect(calls).toBe(3);
  });

  it('keeps polling after a transient fetch error', async () => {
    let calls = 0;
    await waitForMembershipRolesApplied('acme', fast, async () => {
      calls += 1;
      if (calls === 1) throw new Error('socket hang up');
      return ready;
    });
    expect(calls).toBe(2);
  });

  it('throws AuthorizationError once the deadline passes without RolesApplied', async () => {
    await expect(
      waitForMembershipRolesApplied('acme', { ...fast, timeoutMs: 20 }, async () => pending)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('honours the post-ready delay before resolving', async () => {
    const started = Date.now();
    await waitForMembershipRolesApplied(
      'acme',
      { ...fast, postReadyDelayMs: 30 },
      async () => ready
    );
    expect(Date.now() - started).toBeGreaterThanOrEqual(25);
  });
});
