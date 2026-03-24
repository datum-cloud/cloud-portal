// app/resources/invitations/invitation.watch.ts
import { toInvitation } from './invitation.adapter';
import { invitationKeys } from './invitation.service';
import type { ComMiloapisIamV1Alpha1UserInvitation } from '@/modules/control-plane/iam';
import { useResourceWatch } from '@/modules/watch/use-resource-watch';

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
 * - MODIFIED event → invitation updated in-place (accepted/declined state change)
 * - DELETED event → invitation removed from cache → badge decrements
 *
 * Note: userScoped flows to watchManager.subscribe() via the ...watchOptions
 * spread in use-resource-watch.ts — no change to that file is needed.
 */
export function useInvitationWatch(userId: string) {
  useResourceWatch({
    resourceType: 'apis/iam.miloapis.com/v1alpha1/userinvitations',
    userScoped: true,
    queryKey: invitationKeys.userList(userId),
    // Wrapper required: toInvitation has a concrete input type, not (unknown) => T.
    transform: (raw: unknown) => toInvitation(raw as ComMiloapisIamV1Alpha1UserInvitation),
    skipInitialSync: false, // ADDED = new invitation, always update badge
    enabled: !!userId,
    getItemKey: (inv) => inv.name,
  });
}
