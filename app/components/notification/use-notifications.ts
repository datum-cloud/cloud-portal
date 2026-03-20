// app/components/notification/use-notifications.ts
import type { INotification } from './types';
import { useUserInvitations, useInvitationWatch } from '@/resources/invitations';

/**
 * Notification hook — composes a direct K8s API fetch with a real-time watch.
 *
 * Initial list: loaded via useUserInvitations (React Query, direct K8s API call).
 * Live updates: delivered via useInvitationWatch (K8s Watch API through SSE).
 *
 * Badge count: pendingCount = invitations.length.
 * The only way to reduce the badge is to accept or decline an invitation.
 * The watch event (MODIFIED/DELETED) removes it from the React Query cache automatically.
 *
 * Passing 'me' works because the underlying service calls getUserScopedBase()
 * which uses 'me' internally, and the watch server resolves identity from session.
 */
export function useNotifications() {
  const { data: invitations = [], isLoading, error } = useUserInvitations('me');

  useInvitationWatch('me');

  const notifications: INotification[] = invitations.map((invitation) => ({
    id: `invitation-${invitation.name}`,
    source: 'invitation' as const,
    data: invitation,
  }));

  return {
    notifications,
    pendingCount: invitations.length,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}
