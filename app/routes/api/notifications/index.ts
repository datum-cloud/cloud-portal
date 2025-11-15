import type {
  INotification,
  NotificationSourceType,
} from '@/modules/datum-ui/components/notification/types';
import { createInvitationsControl } from '@/resources/control-plane';
import { IInvitationControlResponse } from '@/resources/interfaces/invitation.interface';
import { getSession } from '@/utils/cookies';
import { Client } from '@hey-api/client-axios';
import type { AppLoadContext, LoaderFunctionArgs } from 'react-router';
import { data } from 'react-router';

export const ROUTE_PATH = '/api/notifications' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { session } = await getSession(request);
  const url = new URL(request.url);

  // Optional filters
  const sources =
    url.searchParams.get('sources')?.split(',') || (['invitation'] as NotificationSourceType[]);

  try {
    // Fetch notifications from all enabled sources
    const allNotifications: INotification[] = [];

    // Add invitation notifications if requested
    if (sources.includes('invitation')) {
      const invitationsControl = createInvitationsControl(controlPlaneClient as Client);
      const invitations = await invitationsControl.userInvitations(session?.sub ?? '');
      const transformedInvitations: INotification<IInvitationControlResponse>[] = invitations.map(
        (invitation) => {
          return {
            id: `invitation-${invitation.name}`,
            source: 'invitation',
            isRead: false, // Always false from API, managed client-side
            data: invitation, // Just pass through the control-plane response
          };
        }
      );
      allNotifications.push(...transformedInvitations);
    }

    // Calculate counts
    const counts = {
      total: allNotifications.length,
      unread: allNotifications.filter((n) => !n.isRead).length,
      bySource: {
        invitation: allNotifications.filter((n) => n.source === 'invitation' && !n.isRead).length,
      },
    };

    const response = {
      notifications: allNotifications,
      counts,
    };

    return data({ success: true, data: response });
  } catch (error) {
    return data({ success: false, error: 'Failed to load notifications' }, { status: 500 });
  }
};
