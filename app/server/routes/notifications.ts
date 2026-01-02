// app/server/routes/notifications.ts
import type { Variables } from '../types';
import { createControlPlaneClient } from '@/modules/control-plane/control-plane.factory';
import { createInvitationService, type Invitation } from '@/resources/invitations';
import { Hono } from 'hono';

interface INotification<T = unknown> {
  id: string;
  source: string;
  isRead: boolean;
  data: T;
}

const notifications = new Hono<{ Variables: Variables }>();

notifications.get('/', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestId = c.get('requestId') ?? crypto.randomUUID();
    const controlPlaneClient = createControlPlaneClient(session.accessToken);

    const invitationService = createInvitationService({
      controlPlaneClient,
      requestId,
    });

    const invitations = await invitationService.userInvitations(session.sub ?? '');

    const notificationsList: INotification<Invitation>[] = invitations.map((invitation) => ({
      id: `invitation-${invitation.name}`,
      source: 'invitation',
      isRead: false,
      data: invitation,
    }));

    return c.json({
      success: true,
      data: {
        notifications: notificationsList,
        counts: {
          total: notificationsList.length,
          unread: notificationsList.length,
          bySource: { invitation: notificationsList.length },
        },
      },
    });
  } catch (error) {
    console.error('Notifications error:', error instanceof Error ? error.message : 'Unknown error');
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load notifications',
      },
      500
    );
  }
});

export { notifications as notificationsRoutes };
