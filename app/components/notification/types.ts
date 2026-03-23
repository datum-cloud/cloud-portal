import type { Invitation } from '@/resources/invitations';

export type NotificationSourceType = 'invitation';

/** A single notification item — wraps a domain resource with notification metadata. */
export interface INotification {
  id: string;
  source: NotificationSourceType;
  data: Invitation;
}

/** Tab configuration for notification sources in the dropdown. */
export interface NotificationTab {
  id: NotificationSourceType;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  emptyMessage?: string;
}

/** Props for the NotificationDropdown component. */
export interface NotificationDropdownProps {
  defaultTab?: NotificationSourceType;
}

/** Props for the NotificationBell component. */
export interface NotificationBellProps {
  pendingCount: number;
}

/** Props for the NotificationList component. */
export interface NotificationListProps {
  notifications: INotification[];
}

/** Props for individual notification item components. */
export interface ResourceNotificationItemProps {
  notification: INotification;
}

/** Props for NotificationItemWrapper component. */
export interface NotificationItemWrapperProps {
  children: React.ReactNode;
  onNavigate?: () => void;
}

/** Props for NotificationEmpty component. */
export interface NotificationEmptyProps {
  message?: string;
}
