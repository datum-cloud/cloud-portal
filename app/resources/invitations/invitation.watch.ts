// app/resources/invitations/invitation.watch.ts
import { toInvitation } from './invitation.adapter';
import type { Invitation } from './invitation.schema';
import { invitationKeys } from './invitation.service';
import type { ComMiloapisIamV1Alpha1UserInvitation } from '@/modules/control-plane/iam';
import type { CacheItemMeta } from '@/modules/watch/resource-cache';
import { useResourceWatch } from '@/modules/watch/use-resource-watch';

/**
 * The list holds only Pending invitations, so any other state counts as removed;
 * this also keeps the rv=0 replay of old invitations out.
 */
export const userInvitationListCache = {
  getItemKey: (invitation: Invitation) => invitation.name,
  getMeta: (invitation: Invitation): CacheItemMeta => ({
    name: invitation.name,
    resourceVersion: invitation.resourceVersion,
    removed: invitation.state !== 'Pending',
  }),
};

/**
 * Subscribe to real-time K8s watch events for the current user's invitations.
 *
 * Works alongside useUserInvitations (which handles the initial fetch).
 * Uses the existing WatchManager SSE connection — no new connection opened.
 *
 * The server resolves the user from the authenticated session; pass any truthy
 * string (e.g. 'me') — it is only used as an enabled guard, not sent to the server.
 *
 * Cache update behaviour:
 * - ADDED event   → new invitation in cache → badge increments
 * - MODIFIED event → updated in place while Pending; removed once it leaves Pending
 * - DELETED event → invitation removed from cache → badge decrements
 *
 * Note: userScoped flows to watchManager.subscribe() via the ...watchOptions
 * spread in use-resource-watch.ts — no change to that file is needed.
 */
export function useInvitationWatch(userId: string) {
  useResourceWatch<Invitation>({
    resourceType: 'apis/iam.miloapis.com/v1alpha1/userinvitations',
    userScoped: true,
    queryKey: invitationKeys.userList(userId),
    // Wrapper required: toInvitation has a concrete input type, not (unknown) => T.
    transform: (raw: unknown) => toInvitation(raw as ComMiloapisIamV1Alpha1UserInvitation),
    enabled: !!userId,
    ...userInvitationListCache,
  });
}
