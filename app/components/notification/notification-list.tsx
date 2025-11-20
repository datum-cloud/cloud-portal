import { InvitationNotificationItem } from './items';
import type { NotificationListProps } from './types';

/**
 * NotificationList component - routes notifications to resource-specific components
 */
export function NotificationList({
  notifications,
  onMarkAsRead,
  onRefresh,
}: NotificationListProps) {
  return (
    <div className="divide-border divide-y">
      {notifications.map((notification) => {
        // Route to resource-specific component based on source
        switch (notification.source) {
          case 'invitation':
            return (
              <InvitationNotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onRefresh={onRefresh}
              />
            );
          default:
            // Fallback for unknown notification types
            return null;
        }
      })}
    </div>
  );
}
