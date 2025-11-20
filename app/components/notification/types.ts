/**
 * Notification source types
 */
export type NotificationSourceType = 'invitation';

/**
 * Simple wrapper around control-plane response to add client-side read state
 * T = the actual control-plane response type (e.g., IInvitationControlResponse)
 */
export interface INotification<T = any> {
  id: string;
  source: NotificationSourceType;
  isRead: boolean; // Client-side only
  data: T; // The actual control-plane response
}

/**
 * Tab configuration for notification sources
 */
export interface NotificationTab {
  id: NotificationSourceType;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  emptyMessage?: string;
}

/**
 * API response from BFF endpoint
 */
export interface NotificationResponse {
  success: boolean;
  data?: {
    notifications: INotification[];
    counts: {
      total: number;
      unread: number;
      bySource: Record<NotificationSourceType, number>;
    };
  };
  error?: string;
}

/**
 * Polling hook configuration
 */
export interface UseNotificationPollingOptions {
  interval?: number;
  enabled?: boolean;
  sources?: NotificationSourceType[]; // Filter specific sources
  onUpdate?: (counts: Record<NotificationSourceType, number>) => void;
}

/**
 * Props for NotificationDropdown component
 */
export interface NotificationDropdownProps {
  pollingInterval?: number;
  defaultTab?: NotificationSourceType;
}

/**
 * Props for NotificationBell component
 */
export interface NotificationBellProps {
  unreadCount: number;
}

/**
 * Props for NotificationList component
 */
export interface NotificationListProps {
  notifications: INotification[];
  onMarkAsRead: (id: string) => void;
  onRefresh: () => void;
}

/**
 * Props for resource-specific notification item components
 * Generic T allows each item to specify its own data type
 */
export interface ResourceNotificationItemProps<T = any> {
  notification: INotification<T>;
  onMarkAsRead: (id: string) => void;
  onRefresh: () => void;
}

/**
 * Props for NotificationItemWrapper component
 */
export interface NotificationItemWrapperProps {
  children: React.ReactNode;
  onNavigate?: () => void;
}

/**
 * Props for NotificationEmpty component
 */
export interface NotificationEmptyProps {
  message?: string;
}
