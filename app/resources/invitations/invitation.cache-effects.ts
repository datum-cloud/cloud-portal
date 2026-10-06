import { invitationKeys } from './invitation.service';
import { removeResource } from '@/modules/watch/resource-cache';
import {
  memberCacheEffects,
  organizationCacheEffects,
} from '@/resources/members/member.cache-effects';
import type { QueryClient } from '@tanstack/react-query';

export const invitationCacheEffects = {
  async orgListChanged(qc: QueryClient, orgId: string): Promise<void> {
    await qc.invalidateQueries({ queryKey: invitationKeys.list(orgId) });
  },

  /** The user's list is watched, so the row is removed; the unwatched org lists invalidate. */
  async resolved(qc: QueryClient, orgId: string, name: string): Promise<void> {
    await qc.cancelQueries({ queryKey: invitationKeys.userLists() });
    removeResource(
      qc,
      { lists: invitationKeys.userLists(), detail: (n) => invitationKeys.detail(orgId, n) },
      name,
      { getName: (item) => (item as { name: string }).name }
    );
    await Promise.all([
      invitationCacheEffects.orgListChanged(qc, orgId),
      memberCacheEffects.changed(qc, orgId),
      organizationCacheEffects.membershipChanged(qc),
    ]);
  },
};
